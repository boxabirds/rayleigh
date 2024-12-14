#!/bin/bash

# Load environment variables
source .env

# Run migrations with the correct path
echo "Running migrations from db/migrations..."
migrate -path db/migrations -database "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable" up
