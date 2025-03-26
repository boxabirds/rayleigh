package api

import (
	"encoding/json"
	"net/http"
	"time"

	"rayleigh/pkg/db/query"
)

type Handler struct {
	queries *query.Queries
}

func NewHandler(queries *query.Queries) *Handler {
	return &Handler{
		queries: queries,
	}
}

type CreatePostRequest struct {
	PostID     string   `json:"post_id"`
	CreatorDID string   `json:"creator_did"`
	Text       string   `json:"text"`
	Tags       []string `json:"tags"`
}

type SearchPostsRequest struct {
	Tags         []string  `json:"tags"`
	CreatorDIDs  []string  `json:"creator_dids,omitempty"`
	CreatedAfter time.Time `json:"created_after"`
	Limit        int32     `json:"limit"`
	Offset       int32     `json:"offset"`
}

func (h *Handler) CreatePostWithTags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.PostID == "" || req.CreatorDID == "" || req.Text == "" {
		http.Error(w, "PostID, CreatorDID, and Text are required", http.StatusBadRequest)
		return
	}

	// Create post with tags
	err := h.queries.CreatePostWithTags(r.Context(), query.CreatePostWithTagsParams{
		PostID:     req.PostID,
		CreatorDid: req.CreatorDID,
		CreatedAt:  time.Now(),
		Text:       req.Text,
		Tags:       req.Tags,
	})
	if err != nil {
		http.Error(w, "Failed to create post: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) SearchPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SearchPostsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if len(req.Tags) == 0 {
		http.Error(w, "At least one tag is required", http.StatusBadRequest)
		return
	}

	// Set default values
	if req.Limit == 0 {
		req.Limit = 50
	}
	if req.CreatedAfter.IsZero() {
		req.CreatedAfter = time.Now().AddDate(-1, 0, 0) // Default to 1 year ago
	}

	var posts interface{}
	var err error

	if len(req.CreatorDIDs) > 0 {
		// Search by tags and creators
		posts, err = h.queries.GetRecentRootPostsByTagAndCreator(r.Context(), query.GetRecentRootPostsByTagAndCreatorParams{
			TagNames:     req.Tags,
			CreatedAfter: req.CreatedAfter,
			CreatorDids:  req.CreatorDIDs,
			RowOffset:    req.Offset,
			RowLimit:     req.Limit,
		})
	} else {
		// Search by tags only
		posts, err = h.queries.GetRecentRootPostsByTags(r.Context(), query.GetRecentRootPostsByTagsParams{
			TagNames:     req.Tags,
			CreatedAfter: req.CreatedAfter,
			RowOffset:    req.Offset,
			RowLimit:     req.Limit,
		})
	}

	if err != nil {
		http.Error(w, "Failed to search posts: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
} 