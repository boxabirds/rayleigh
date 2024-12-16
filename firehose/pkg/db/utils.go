package db

import (
	"database/sql"
	"encoding/json"
	"firehose/pkg/db/query"
	"firehose/pkg/jetstream"
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/bluesky-social/jetstream/pkg/models"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// GetPostgresURL loads environment variables and constructs a PostgreSQL connection URL
func GetPostgresURL() string {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found: %v", err)
	}

	// Required environment variables
	requiredVars := []string{
		"DB_USER",
		"DB_PASSWORD",
		"DB_HOST",
		"DB_PORT",
		"DB_NAME",
	}

	// Check for missing required variables
	missingVars := []string{}
	for _, v := range requiredVars {
		if os.Getenv(v) == "" {
			missingVars = append(missingVars, v)
		}
	}

	if len(missingVars) > 0 {
		log.Fatalf("Missing required environment variables: %v", missingVars)
	}

	// Encode the password to handle special characters
	encodedPassword := url.QueryEscape(os.Getenv("DB_PASSWORD"))

	// Construct PostgreSQL connection URL
	postgresURL := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable&search_path=public",
		os.Getenv("DB_USER"),
		encodedPassword,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	// Set the environment variable for other parts of the application
	// TODO evaluate if this is needed still needed
	os.Setenv("POSTGRESQL_URL", postgresURL)

	return postgresURL
}

// DatabaseExists checks if the specified database exists
func DatabaseExists(connectionString string) bool {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return false
	}
	defer db.Close()

	var exists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", os.Getenv("DB_NAME")).Scan(&exists)
	if err != nil {
		log.Printf("Failed to check database existence: %v", err)
		return false
	}

	return exists
}

// CreateDatabase creates a new database using the admin connection string
func CreateDatabase() bool {
	adminConnStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/postgres?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
	)

	db, err := sql.Open("postgres", adminConnStr)
	if err != nil {
		log.Printf("Failed to connect to PostgreSQL as admin: %v", err)
		return false
	}
	defer db.Close()

	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE %s", os.Getenv("DB_NAME")))
	if err != nil {
		log.Printf("Failed to create database: %v", err)
		return false
	}

	log.Printf("Database %s created successfully.", os.Getenv("DB_NAME"))
	return true
}

func extractTags(facets []jetstream.Facet) []string {
	tags := make([]string, 0)

	for _, facet := range facets {
		for _, feature := range facet.Features {
			if feature.Type == "app.bsky.richtext.facet#tag" && feature.Tag != "" {
				tags = append(tags, feature.Tag)
			}
		}
	}

	return tags
}

// ExtractPost parses the JSON data and returns a query.Post
func ExtractPost(evt *models.Event) (*query.CreatePostWithTagsParams, error) {

	var post jetstream.PostCommitRecord
	// Unmarshal the data into the Post struct

	if err := json.Unmarshal(evt.Commit.Record, &post); err != nil {
		return nil, fmt.Errorf("failed to unmarshal post commit data: %w", err)
	}

	tags := extractTags(post.Facets)

	postParams := query.CreatePostWithTagsParams{
		PostID:     evt.Commit.RKey,
		CreatorDid: evt.Did,
		Text:       post.Text,
		CreatedAt:  post.CreatedAt,
		Tags:       tags,
	}
	fmt.Printf("Adding Post ID: %s\n", postParams.PostID)

	return &postParams, nil
}
