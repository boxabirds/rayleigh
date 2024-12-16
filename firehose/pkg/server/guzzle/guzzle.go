package guzzle

import (
	"context"
	"database/sql"
	dbutils "firehose/pkg/db"
	"firehose/pkg/db/query"
	"firehose/pkg/jetstream"
	"fmt"
	"io"
	"log"
	"log/slog"
	"math"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/bluesky-social/jetstream/pkg/client"
	"github.com/bluesky-social/jetstream/pkg/client/schedulers/sequential"
	"github.com/bluesky-social/jetstream/pkg/models"
)

const (
	maxRetries     = 3
	baseRetryDelay = time.Second
	failureTimeout = time.Hour
)

// documented at https://github.com/bluesky-social/jetstream/tree/main
var defaultJetstreamURLs = []string{
	"wss://jetstream1.us-east.bsky.network/subscribe",
	"wss://jetstream2.us-east.bsky.network/subscribe",
	"wss://jetstream3.us-east.bsky.network/subscribe",
	"wss://jetstream4.us-east.bsky.network/subscribe",
}

// Config holds the guzzle configuration
type Config struct {
	DBPath  string
	LogPath string
	// Optional custom Jetstream URLs
	JetstreamURLs []string
}

// Guzzle represents the firehose ingestion service
type Guzzle struct {
	config  *Config
	db      *sql.DB
	client  *client.Client
	mu      sync.RWMutex
	metrics *metrics
	logger  *log.Logger
}

// metrics tracks operational metrics
type metrics struct {
	entriesLogged uint64
	spaceUsed     uint64
	lastUpdate    time.Time
}

// New creates a new guzzle instance
func New(cfg *Config) (*Guzzle, error) {
	if cfg == nil {
		return nil, fmt.Errorf("config cannot be nil")
	}

	// Set default URLs if none provided
	if len(cfg.JetstreamURLs) == 0 {
		cfg.JetstreamURLs = defaultJetstreamURLs
	}

	// Open log file
	logFile, err := os.OpenFile(cfg.LogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}

	// connect to the db
	connStr := dbutils.GetPostgresURL()
	dbConn, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}

	g := &Guzzle{
		config: cfg,
		db:     dbConn,
		metrics: &metrics{
			lastUpdate: time.Now(),
		},
		logger: log.New(logFile, "", log.LstdFlags),
	}

	return g, nil
}

// Run runs the guzzle service until the context is cancelled
func (g *Guzzle) Run(ctx context.Context, cursor string) error {
	g.logger.Println("Starting guzzle service...")
	defer g.logger.Println("Guzzle service stopped")

	// Backfill -- NOT it only goes back a few hours. You do this to catch up if the server is down for any time.
	var startTime time.Time
	var cursorPtr *int64

	if cursor != "" {
		g.logger.Printf("Attempting to backfill from cursor: %s", cursor)
		parsedTime, err := time.Parse("02/01/2006", cursor) // Standard format for DD/MM/YYYY
		if err != nil {
			return fmt.Errorf("invalid cursor format: %w", err)
		}
		startTime = parsedTime
		cursorValue := startTime.UnixMicro()
		cursorPtr = &cursorValue
		g.logger.Printf("Backfill starting from: %s", startTime.Format(time.RFC3339))
	} else {
		g.logger.Println("Realtime firehose enabled")
		startTime = time.Now()
		cursorPtr = nil
	}

	// Create error channel for goroutine errors
	errCh := make(chan error, 1)

	// Start metrics logger
	metricsCtx, metricsCancel := context.WithCancel(ctx)
	defer metricsCancel()
	go func() {
		if err := g.logMetrics(metricsCtx); err != nil {
			errCh <- fmt.Errorf("metrics logger error: %w", err)
		}
	}()

	// Create a scheduler that will handle events sequentially
	scheduler := sequential.NewScheduler("raileigh_guzzle", slog.Default(), func(ctx context.Context, event *models.Event) error {
		return g.handleEvent(ctx, event)
	})

	// we round-robin between the URLs
	jetStreamUrlIndex := 0
	for {
		select {
		case <-ctx.Done():
			g.logger.Println("Received shutdown signal")
			return ctx.Err()
		case err := <-errCh:
			g.logger.Printf("Error in background task: %v", err)
			return err
		default:
			url := g.config.JetstreamURLs[jetStreamUrlIndex]
			g.logConnectionStatus(true, url)

			clientConfig := client.DefaultClientConfig()
			clientConfig.WebsocketURL = url
			clientConfig.Compress = true

			var err error
			g.client, err = client.NewClient(clientConfig, slog.Default(), scheduler)
			if err != nil {
				g.logConnectionStatus(false, url)
				return fmt.Errorf("failed to create client: %w", err)
			}

			g.logger.Printf("Using cursor: %v", cursorPtr) // Log the cursor value
			err = g.client.ConnectAndRead(ctx, cursorPtr)

			if err != nil {
				g.logConnectionStatus(false, url)
				if err == context.Canceled {
					return err
				}

				jetStreamUrlIndex = (jetStreamUrlIndex + 1) % len(g.config.JetstreamURLs)
				if jetStreamUrlIndex == 0 {
					g.logAllEndpointsFailed()
					select {
					case <-ctx.Done():
						return ctx.Err()
					case <-time.After(failureTimeout):
						continue
					}
				}

				backoff := time.Duration(math.Pow(2, float64(jetStreamUrlIndex))) * baseRetryDelay
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(backoff):
					continue
				}
			}

			endTime := time.Now()
			g.logger.Printf("Backfill completed. Execution time: %s", endTime.Sub(startTime))
		}
	}
}

// handleEvent processes a single event from the firehose
func (g *Guzzle) handleEvent(ctx context.Context, evt *models.Event) error {

	// filter
	if evt.Kind != models.EventKindCommit || evt.Commit == nil {
		return nil
	}

	// only updates and deletes are sent as posts are immutable.
	// we only continue for bsky feed posts and Create and Delete operations
	//if evt.Commit.Collection != "app.bsky.feed.post" || evt.Commit.Operation != models.CommitOperationCreate && evt.Commit.Operation != models.CommitOperationDelete {
	// TODO support deletion
	if evt.Commit.Collection != "app.bsky.feed.post" || evt.Commit.Operation != models.CommitOperationCreate {
		if evt.Commit.Operation == models.CommitOperationDelete {
			// TODO support deletion
			g.logger.Printf("Commit: TODO request to DELETE '%s' just logging for now", string(evt.Commit.RKey))
		}
		return nil
	}

	// print the commit record
	// evtJSON, err := json.Marshal(evt)
	// if err != nil {
	// 	g.logger.Printf("failed to marshal event: %v", err)
	// 	return err
	// }
	//g.logger.Printf("Commit: %s", string(evtJSON))

	// extract the tags
	// data := pqtype.NullRawMessage{Valid: true, RawMessage: evt.Commit.Record}
	post, err := jetstream.ExtractPost(evt)
	if err != nil {
		// golly it'd be nice of the logger library supported %w too right
		g.logger.Printf("failed to extract post: %v", err)
		return err
	}

	// now check we have a qualifying post: we need to have at least one tag and no reply
	if len(post.Tags) == 0 || post.Reply != nil {
		//g.logger.Printf("Post does not meet criteria for persistence (tags: %d, reply: %v)", len(post.Tags), post.Reply != nil)
		return nil
	}

	// This mapping was HOURS of work to figure out.
	// it'd be nice if the jetstream library exposed the post commit interfaces
	// but as of Dec 2024 it didn't
	postParams := query.CreatePostWithTagsParams{
		PostID:     evt.Commit.RKey,
		CreatorDid: evt.Did,
		Text:       post.Text,
		CreatedAt:  post.CreatedAt,
		Tags:       post.Tags,
	}

	dbQueries := query.New(g.db)
	err = dbQueries.CreatePostWithTags(ctx, postParams)
	if err != nil {
		g.logger.Printf("failed to create post: %v", err)
		return err
	}
	g.logger.Printf("Post saved to db, ID: %s, text '%s'", evt.Commit.RKey, strings.ReplaceAll(post.Text, "\n", " "))
	return nil
}

// formatBytes formats bytes into a human readable string with both bytes and MB
func formatBytes(bytes uint64) string {
	mb := float64(bytes) / (1024 * 1024)
	return fmt.Sprintf("%d bytes (%.2f MB)", bytes, mb)
}

// logMetrics logs the current metrics every minute
func (g *Guzzle) logMetrics(ctx context.Context) error {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			g.mu.RLock()
			g.logger.Printf("Metrics - Entries: %d, Space Used: %s",
				g.metrics.entriesLogged,
				formatBytes(g.metrics.spaceUsed))
			g.mu.RUnlock()
		}
	}
}

// logConnectionStatus logs connection attempts and failures
func (g *Guzzle) logConnectionStatus(connected bool, url string) {
	status := "Connected to"
	if !connected {
		status = "Failed to connect to"
	}

	g.logger.Printf("Connection status: %s %s", status, url)
}

// logAllEndpointsFailed logs when all endpoints have failed
func (g *Guzzle) logAllEndpointsFailed() {
	message := "All endpoints failed, sleeping for 1 hour"
	g.logger.Println(message)
}

// Close closes the guzzle service and cleans up resources
func (g *Guzzle) Close() error {
	g.logger.Println("Shutting down guzzle service...")

	g.mu.RLock()
	g.logger.Printf("Final Metrics - Total Entries: %d, Total Space Used: %s",
		g.metrics.entriesLogged,
		formatBytes(g.metrics.spaceUsed))
	g.mu.RUnlock()

	if err := g.db.Close(); err != nil {
		g.logger.Printf("Error closing database: %v", err)
		return fmt.Errorf("failed to close database: %w", err)
	}
	g.logger.Println("Database closed successfully")

	if closer, ok := g.logger.Writer().(io.Closer); ok {
		if err := closer.Close(); err != nil {
			return fmt.Errorf("failed to close log file: %w", err)
		}
	}

	return nil
}
