package main

import (
	"log"
	"os"

	"firehose/pkg/db/migration"
)

func main() {
	if err := migration.LoadEnv(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Check if sqlc is installed
	if ok, instruction := migration.CheckSQLC(); !ok {
		log.Fatalf("sqlc not found: %s", instruction)
	}

	// Use connection string from environment
	connectionString := os.Getenv("POSTGRESQL_URL")
	migrationsPath := "file://db/migrations"

	if err := migration.MigrateDown(connectionString, migrationsPath); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Generate SQLC bindings
	migration.GenerateSQLC()
}
