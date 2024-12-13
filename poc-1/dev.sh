#!/bin/bash

# Kill any existing Vite or TSX processes
echo "Cleaning up existing processes..."
pkill -f vite
pkill -f tsx

# Wait a moment for ports to be freed
sleep 1

# Start the development servers
echo "Starting development servers..."
npm run dev:all
