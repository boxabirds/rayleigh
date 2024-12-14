package main

import (
	"log"
	"os"

	"firehose/pkg/db/generate"
	"firehose/pkg/db/migration"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	// Check if sqlc is installed
	if ok, instruction := generate.CheckSQLC(); !ok {
		log.Fatalf("sqlc not found: %s", instruction)
	}

	// Use connection string from environment
	connectionString := os.Getenv("POSTGRESQL_URL")
	migrationsPath := "file://db/migrations"

	if err := migration.MigrateUp(connectionString, migrationsPath); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}
