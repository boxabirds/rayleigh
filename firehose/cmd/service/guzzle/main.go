package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"firehose/pkg/server/guzzle"
)

var (
	logPath = flag.String("log", "logs/guzzle.log", "Path to the log file")
	cursor  = flag.String("cursor", "", "Cursor in DD/MM/YYYY format")
)

func main() {
	flag.Parse()

	// Create logs directory if needed
	logDir := filepath.Dir(*logPath)
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Fatalf("Failed to create logs directory: %v", err)
	}

	// Create guzzle service
	g, err := guzzle.New(&guzzle.Config{
		LogPath: *logPath,
	})
	if err != nil {
		log.Fatalf("Failed to create guzzle service: %v", err)
	}

	// Ensure clean shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		cancel()
		if err := g.Close(); err != nil {
			log.Printf("Error during shutdown: %v", err)
		}
	}()

	// Handle shutdown signals
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		log.Printf("Received %s signal, initiating graceful shutdown...", sig)
		cancel()
	}()

	// Run guzzle service with cursor and duration
	log.Printf("Starting guzzle service ")
	if err := g.Run(ctx, *cursor); err != nil && err != context.Canceled {
		log.Printf("Guzzle service error: %v", err)
	}
}
