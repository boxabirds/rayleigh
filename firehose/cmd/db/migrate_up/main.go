package main

import (
	"log"

	"firehose/pkg/db/migration"
)

func main() {
	connectionString := "your_connection_string_here"
	migrationsPath := "file://db/migrations"

	if err := migration.MigrateUp(connectionString, migrationsPath); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}
