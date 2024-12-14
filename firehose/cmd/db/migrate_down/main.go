package main

import (
	"log"
	"os"

	"firehose/pkg/db/migration"
	"github.com/joho/godotenv"
)

func main() {
	if err := loadEnv(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Use connection string from environment
	connectionString := os.Getenv("POSTGRESQL_URL")
	migrationsPath := "file://db/migrations"

	if err := migration.MigrateDown(connectionString, migrationsPath); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}

func loadEnv() error {
	return godotenv.Load()
}
