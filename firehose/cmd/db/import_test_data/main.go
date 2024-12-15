package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	dbutils "firehose/pkg/db"
	"firehose/pkg/db/query"

	_ "github.com/lib/pq"
	"github.com/sqlc-dev/pqtype"
)

func main() {
	// Check if JSON file path is provided as first argument
	if len(os.Args) < 2 {
		log.Fatal("Please provide a path to the JSON file as an argument")
	}

	jsonFilePath := os.Args[1]

	// Get database connection string
	connStr := dbutils.GetPostgresURL()

	// Open the JSON file
	file, err := os.Open(jsonFilePath)
	if err != nil {
		log.Fatalf("Failed to open file: %v", err)
	}
	defer file.Close()

	// Establish database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	// Initialize Queries with the database connection
	dbQueries := query.New(db)

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()

		// Strip trailing comma if present
		line = strings.TrimRight(line, ",")

		// Parse the entire line as a map
		var postMap map[string]interface{}
		if err := json.Unmarshal([]byte(line), &postMap); err != nil {
			log.Printf("Failed to unmarshal line: %v", err)
			continue
		}

		// Parse the nested data string
		var dataMap map[string]interface{}
		if err := json.Unmarshal([]byte(postMap["data"].(string)), &dataMap); err != nil {
			log.Printf("Failed to unmarshal data string: %v", err)
			continue
		}

		// Convert data map back to JSON
		dataJSON, err := json.Marshal(dataMap)
		if err != nil {
			log.Printf("Failed to marshal data map: %v", err)
			continue
		}

		// Parse created_at time
		createdAt, err := time.Parse("2006-01-02 15:04:05.999999-07:00", postMap["created_at"].(string))
		if err != nil {
			log.Printf("Failed to parse created_at: %v", err)
			continue
		}

		// Convert to query.Post
		post := query.Post{
			PostID:     postMap["post_id"].(string),
			CreatorDid: postMap["did"].(string),
			Text:       postMap["text"].(string),
			CreatedAt:  createdAt,
			Data: pqtype.NullRawMessage{
				RawMessage: dataJSON,
				Valid:      true,
			},
		}

		// Check if post already exists
		_, err = dbQueries.GetPostById(context.Background(), post.ID)
		if err == nil {
			log.Printf("Skipping duplicate post with ID %d", post.ID)
			continue
		} else if err != sql.ErrNoRows {
			log.Printf("Error checking post existence: %v", err)
			continue
		}

		// Extract tags using the utility function from db package
		tags := dbutils.ExtractTags(post.Data)

		log.Printf("Tags extracted: %v", tags)

		// Use CreatePostWithTags to create posts
		params := query.CreatePostWithTagsParams{
			CreatorDid: post.CreatorDid,
			Text:       post.Text,
			CreatedAt:  post.CreatedAt,
			Tags:       tags,
		}
		if err := dbQueries.CreatePostWithTags(context.Background(), params); err != nil {
			log.Printf("Failed to create post with tags: %v", err)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading file: %v", err)
	}
}
