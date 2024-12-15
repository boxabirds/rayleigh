package main

import (
	"firehose/pkg/db"
	"firehose/pkg/db/generate"
	"firehose/pkg/db/migration"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Check if sqlc is installed
	if ok, instruction := generate.CheckSQLC(); !ok {
		log.Fatalf("sqlc not found: %s", instruction)
	}

	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	connStr := db.GetPostgresURL()

	// Check if the database exists
	if !db.DatabaseExists(connStr) {
		fmt.Println("Database does not exist.")
		if db.CreateDatabase() {
			fmt.Println("Database created successfully.")
			if !createInitialMigration() {
				log.Println("Failed to create initial migration files.")
			}
		} else {
			log.Fatal("Failed to create database.")
		}
	} else {
		fmt.Println("Database exists.")
	}

	// Run migrations
	if err := migration.MigrateUp(connStr, "file://db/migrations"); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}

func createInitialMigration() bool {
	files, err := filepath.Glob("db/migrations/*.up.sql")
	if err != nil {
		log.Printf("Failed to list migration files: %v", err)
		return false
	}

	if len(files) == 0 {
		log.Println("Creating initial migration file...")
		// Create initial migration files
		upFile := "db/migrations/000001_initial_schema_setup.up.sql"
		downFile := "db/migrations/000001_initial_schema_setup.down.sql"

		if err := copyFile("db/templates/create_schema.up.sql", upFile); err != nil {
			log.Printf("Failed to copy up migration template: %v", err)
			return false
		}

		if err := copyFile("db/templates/create_schema.down.sql", downFile); err != nil {
			log.Printf("Failed to copy down migration template: %v", err)
			return false
		}

		log.Println("Initial migration files created successfully.")
	}

	return true
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destinationFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destinationFile.Close()

	_, err = io.Copy(destinationFile, sourceFile)
	return err
}
