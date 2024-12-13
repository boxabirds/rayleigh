#!/bin/bash

# Default environment variable values for developers
DB_USER=${DB_USER:-$(whoami)}
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 12)}
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

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "One or more environment variables are missing!"
  exit 1
fi

# Create the database if it does not exist
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo "Database $DB_NAME already exists. Leaving it well alone.🫡"
else
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -c "CREATE DATABASE $DB_NAME;"
  if [ $? -eq 0 ]; then
    echo "Database $DB_NAME created successfully. Now go do some FIREHOSING."
  else
    echo "Failed to create database $DB_NAME. I've failed and I feel bad. 🙁"
  fi
fi
