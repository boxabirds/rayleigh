package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	if len(os.Args) < 2 {
		log.Fatal("Error: No migration name provided. Usage: ./new_migration <migration_name>")
	}
	migrationName := os.Args[1]

	emptyFile, err := findEmptyMigrationFile()
	if err != nil {
		log.Fatalf("Error finding empty migration file: %v", err)
	}

	if emptyFile != "" {
		renameMigrationFiles(emptyFile, migrationName)
		fmt.Println("Migration files renamed successfully.")
		return
	}

	createMigrationFiles(migrationName)
	fmt.Printf("Migration '%s' created successfully.\n", migrationName)
}

func findEmptyMigrationFile() (string, error) {
	files, err := filepath.Glob("db/migrations/*.up.sql")
	if err != nil {
		return "", fmt.Errorf("failed to list migration files: %w", err)
	}

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			return "", fmt.Errorf("failed to stat file %s: %w", file, err)
		}
		if info.Size() == 0 {
			return file, nil
		}
	}

	return "", nil
}

func renameMigrationFiles(emptyFile, migrationName string) {
	baseName := filepath.Base(emptyFile)
	parts := strings.SplitN(baseName, "_", 2)
	if len(parts) < 2 {
		log.Fatalf("Invalid file name: %s", baseName)
	}

	prefix := parts[0]
	newUpFile := fmt.Sprintf("db/migrations/%s_%s.up.sql", prefix, migrationName)
	newDownFile := fmt.Sprintf("db/migrations/%s_%s.down.sql", prefix, migrationName)

	downFile := strings.Replace(emptyFile, ".up.sql", ".down.sql", 1)

	os.Rename(emptyFile, newUpFile)
	os.Rename(downFile, newDownFile)
}

func createMigrationFiles(migrationName string) {
	// Determine the next migration number
	files, err := filepath.Glob("db/migrations/*.up.sql")
	if err != nil {
		log.Fatalf("Error listing migration files: %v", err)
	}

	nextNumber := len(files) + 1
	prefix := fmt.Sprintf("%06d", nextNumber)

	upFile := fmt.Sprintf("db/migrations/%s_%s.up.sql", prefix, migrationName)
	downFile := fmt.Sprintf("db/migrations/%s_%s.down.sql", prefix, migrationName)

	if _, err := os.Create(upFile); err != nil {
		log.Fatalf("Error creating up migration file: %v", err)
	}

	if _, err := os.Create(downFile); err != nil {
		log.Fatalf("Error creating down migration file: %v", err)
	}
}
