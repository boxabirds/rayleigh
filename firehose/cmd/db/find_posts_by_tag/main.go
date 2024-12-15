package main

import (
	"context"
	"database/sql"
	"firehose/pkg/db"
	"firehose/pkg/db/query"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Please provide a tag name as an argument.")
	}

	tagName := os.Args[1]
	limit := int32(10)
	offset := int32(0)

	connStr := db.GetPostgresURL()
	dbConn, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer dbConn.Close()

	dbQueries := query.New(dbConn)

	for {
		posts, err := dbQueries.GetRecentPostsByTags(context.Background(), query.GetRecentPostsByTagsParams{
			Column1:   []string{tagName},
			CreatedAt: time.Now(), // Use a specific time if needed
			Limit:     limit,
			Offset:    offset,
		})
		if err != nil {
			log.Fatalf("Failed to get posts: %v", err)
		}

		if len(posts) == 0 {
			break
		}

		for _, post := range posts {
			fmt.Printf("Post ID: %d, Created At: %s, Tag: %s\n", post.ID, post.CreatedAt, post.TagName)
		}

		offset += limit
	}
}
