package migration

import (
	"database/sql"
	"fmt"
	"log"

	"firehose/pkg/db/generate"

	_ "github.com/lib/pq"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/file"
)

// MigrateUp applies all up migrations and generates SQLC bindings
func MigrateUp(connectionString string, migrationsPath string) error {
	// Check if sqlc is installed
	if ok, instruction := generate.CheckSQLC(); !ok {
		log.Fatalf("sqlc not found: %s", instruction)
	}

	// Connect to the database
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Initialize the migration
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	source, err := (&file.File{}).Open(migrationsPath)
	if err != nil {
		return fmt.Errorf("failed to open migration source: %w", err)
	}

	m, err := migrate.NewWithInstance("file", source, "postgres", driver)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	// Run the migrations
	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			log.Println("No new migrations to apply.")
		} else {
			return fmt.Errorf("migration failed: %w", err)
		}
	} else {
		log.Println("Migrations applied successfully.")
	}

	// Generate SQLC bindings
	generate.GenerateSQLC()

	return nil
}

// MigrateDown rolls back the last migration and generates SQLC bindings
func MigrateDown(connectionString string, migrationsPath string) error {
	// Check if sqlc is installed
	if ok, instruction := generate.CheckSQLC(); !ok {
		log.Fatalf("sqlc not found: %s", instruction)
	}

	// Connect to the database
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Initialize the migration
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	source, err := (&file.File{}).Open(migrationsPath)
	if err != nil {
		return fmt.Errorf("failed to open migration source: %w", err)
	}

	m, err := migrate.NewWithInstance("file", source, "postgres", driver)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	// Rollback the last migration
	if err := m.Steps(-1); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration rollback failed: %w", err)
	}

	log.Println("Migration rolled back successfully.")

	// Generate SQLC bindings
	generate.GenerateSQLC()

	return nil
}
