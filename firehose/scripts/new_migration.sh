#!/bin/bash

# Check if a name is provided
if [ -z "$1" ]; then
  echo "Error: No migration name provided."
  echo "Usage: ./new_migration.sh <migration_name>"
  exit 1
fi

MIGRATION_NAME=$1

# Check for existing empty .up.sql files
EMPTY_FILE=$(find db/migrations -name '*.up.sql' -size 0 | head -n 1)

if [ -n "$EMPTY_FILE" ]; then
  echo "Found an existing empty migration file. Renaming it to match the new migration name."
  mv "$EMPTY_FILE" "db/migrations/$(basename "$EMPTY_FILE" .up.sql)_$MIGRATION_NAME.up.sql"
  DOWN_FILE="${EMPTY_FILE%.up.sql}.down.sql"
  if [ -f "$DOWN_FILE" ]; then
    mv "$DOWN_FILE" "db/migrations/$(basename "$DOWN_FILE" .down.sql)_$MIGRATION_NAME.down.sql"
  fi
  echo "Migration files renamed successfully."
  exit 0
fi

# Create a new migration
migrate create -ext sql -dir db/migrations -seq "$MIGRATION_NAME"

# Inform the user
if [ $? -eq 0 ]; then
  echo "Migration '$MIGRATION_NAME' created successfully."
  echo "Please populate the generated .up.sql and .down.sql files with the necessary SQL commands."
else
  echo "Failed to create migration '$MIGRATION_NAME'."
fi
