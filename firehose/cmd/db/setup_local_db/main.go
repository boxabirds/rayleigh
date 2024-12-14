package main

import (
	"database/sql"
	"firehose/pkg/db/migration"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := loadEnv(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Set up PostgreSQL URL
	encodedPassword := encodePassword(os.Getenv("DB_PASSWORD"))
	postgresURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&search_path=public",
		os.Getenv("DB_USER"), encodedPassword, os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_NAME"))
	os.Setenv("POSTGRESQL_URL", postgresURL)
	fmt.Println("PostgreSQL URL:", postgresURL)

	// Check if the database exists
	if dbExists() {
		fmt.Println("Database exists.")
	} else {
		fmt.Println("Database does not exist.")
		if createDatabase() {
			fmt.Println("Database created successfully.")
			if !createInitialMigration() {
				log.Println("Failed to create initial migration files.")
			}
		} else {
			fmt.Println("Failed to create database.")
		}
	}

	// Run migrations
	if err := migration.MigrateUp(postgresURL, "file://db/migrations"); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}

func loadEnv() error {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("Error loading .env file: %w", err)
	}
	return nil
}

func encodePassword(password string) string {
	return url.QueryEscape(password)
}

func dbExists() bool {
	connectionString := os.Getenv("POSTGRESQL_URL")
	if connectionString == "" {
		log.Println("POSTGRESQL_URL not set")
		return false
	}

	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return false
	}
	defer db.Close()

	var exists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", os.Getenv("DB_NAME")).Scan(&exists)
	if err != nil {
		log.Printf("Failed to check database existence: %v", err)
		return false
	}

	return exists
}

func createDatabase() bool {
	adminConnectionString := fmt.Sprintf("postgres://%s:%s@%s:%s/postgres?sslmode=disable",
		os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_HOST"), os.Getenv("DB_PORT"))

	db, err := sql.Open("postgres", adminConnectionString)
	if err != nil {
		log.Printf("Failed to connect to PostgreSQL as admin: %v", err)
		return false
	}
	defer db.Close()

	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE %s", os.Getenv("DB_NAME")))
	if err != nil {
		log.Printf("Failed to create database: %v", err)
		return false
	}

	log.Printf("Database %s created successfully.", os.Getenv("DB_NAME"))
	return true
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
