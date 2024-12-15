package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"log"
	"os"

	"firehose/pkg/db/query"

	"github.com/sqlc-dev/pqtype"
)

func main() {
	// Command line argument for JSON file path
	jsonFilePath := flag.String("file", "", "Path to the JSON file")
	flag.Parse()

	if *jsonFilePath == "" {
		log.Fatal("Please provide a path to the JSON file using the -file flag.")
	}

	// Open the JSON file
	file, err := os.Open(*jsonFilePath)
	if err != nil {
		log.Fatalf("Failed to open file: %v", err)
	}
	defer file.Close()

	// Establish database connection
	db, err := sql.Open("postgres", os.Getenv("POSTGRESQL_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	// Initialize Queries with the database connection
	dbQueries := query.New(db)

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		var post query.Post
		line := scanner.Text()

		log.Printf("Processing line: %s", line)

		// Unmarshal JSON line into Post struct
		if err := json.Unmarshal([]byte(line), &post); err != nil {
			log.Printf("Failed to unmarshal line: %v", err)
			continue
		}

		// Check if post already exists
		_, err := dbQueries.GetPostById(context.Background(), post.ID)
		if err == nil {
			log.Printf("Skipping duplicate post with ID %d", post.ID)
			continue
		} else if err != sql.ErrNoRows {
			log.Printf("Error checking post existence: %v", err)
			continue
		}

		// Extract tags from the data field
		tags := extractTags(post.Data)

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

// extractTags extracts tags from the data field
func extractTags(data pqtype.NullRawMessage) []string {
	var tags []string

	// Check if data is valid before unmarshalling
	if !data.Valid {
		return tags
	}

	// Unmarshal the data field into a map
	var dataMap map[string]interface{}
	if err := json.Unmarshal(data.RawMessage, &dataMap); err != nil {
		log.Printf("Failed to unmarshal data field: %v", err)
		return tags
	}

	// Process dataMap to extract tags
	// Add your logic here

	return tags
}
