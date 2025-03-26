package api

import (
	"fmt"
	"net/http"

	"rayleigh/pkg/db/query"
)

type Server struct {
	handler *Handler
	port    int
}

func NewServer(queries *query.Queries, port int) *Server {
	return &Server{
		handler: NewHandler(queries),
		port:    port,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Register routes
	mux.HandleFunc("/api/posts/create", s.handler.CreatePostWithTags)
	mux.HandleFunc("/api/posts/search", s.handler.SearchPosts)

	// Start server
	addr := fmt.Sprintf(":%d", s.port)
	return http.ListenAndServe(addr, mux)
} 