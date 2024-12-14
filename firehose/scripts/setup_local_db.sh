#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  set -o allexport
  source .env
  set +o allexport
else
  echo ".env file not found: creating…"
  # Default environment variable values for developers
  DB_USER=${DB_USER:-$(whoami)}
  DB_PASSWORD=${DB_PASSWORD:-$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()' < /dev/urandom | head -c 12; echo)}
  DB_NAME=${DB_NAME:-rayleigh_firehose}
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  # Write the environment variables to .env file
  cat <<EOL > .env
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
EOL
fi


# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "One or more environment variables are missing!"
  exit 1
fi

# Log current directory and files
echo "Current directory: $(pwd)"
echo "Files in migrations directory:"
ls -l db/migrations

# URL-encode the password
ENCODED_DB_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$DB_PASSWORD'''))")
echo "Encoded DB Password: $ENCODED_DB_PASSWORD"

# Set up the PostgreSQL URL with the encoded password
export POSTGRESQL_URL="postgres://$DB_USER:$ENCODED_DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable&search_path=public"
echo "PostgreSQL URL: $POSTGRESQL_URL"

# Check if the database exists
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)
echo "Database exists: $DB_EXISTS"

if [ $DB_EXISTS -eq 1 ]; then
  echo "Database $DB_NAME already exists."
else
  echo "Creating database $DB_NAME..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -c "CREATE DATABASE $DB_NAME;"
fi

# Create a new migration file if none exist
if [ $(ls db/migrations/*.up.sql 2>/dev/null | wc -l) -eq 0 ]; then
  echo "Creating initial migration file..."
  migrate create -ext sql -dir db/migrations -seq initial_schema_setup
  echo "Copying contents from create_schema files..."
  cp db/templates/create_schema.up.sql db/migrations/000001_initial_schema_setup.up.sql
  cp db/templates/create_schema.down.sql db/migrations/000001_initial_schema_setup.down.sql
fi

# Run migrations using migrate_up.sh script
bash scripts/migrate_up.sh
