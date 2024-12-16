package main

import (
	"bufio"
	"context"
	"database/sql"
	"log"
	"os"
	"strings"

	dbutils "firehose/pkg/db"
	"firehose/pkg/db/query"

	_ "github.com/lib/pq"
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

		// Use ExtractPost to process the entire line
		post, err := dbutils.ExtractPost([]byte(line))
		if err != nil {
			log.Printf("failed to extract post: %v", err)
			continue
		}

		// Insert the post into the database
		err = dbQueries.CreatePostWithTags(context.Background(), *post)
		if err != nil {
			log.Printf("failed to create post: %v", err)
			continue
		}
		log.Printf("Post successfully saved to db, ID: %s\n", post.PostID)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading file: %v", err)
	}
}
