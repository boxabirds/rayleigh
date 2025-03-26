package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"rayleigh/pkg/db/query"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestServer(t *testing.T) (*Server, *sql.DB) {
	// Initialize test database connection
	db, err := sql.Open("postgres", "postgres://postgres:postgres@localhost:5432/rayleigh_test?sslmode=disable")
	require.NoError(t, err)

	// Create queries
	queries := query.New(db)

	// Create server
	server := NewServer(queries, 8080)
	return server, db
}

func TestCreatePostWithTags(t *testing.T) {
	server, db := setupTestServer(t)
	defer db.Close()

	tests := []struct {
		name           string
		request        CreatePostRequest
		expectedStatus int
		validateDB     func(*testing.T, *sql.DB, CreatePostRequest)
	}{
		{
			name: "successful post creation",
			request: CreatePostRequest{
				PostID:     "test-post-1",
				CreatorDID: "did:test:123",
				Text:      "Test post",
				Tags:      []string{"test", "integration"},
			},
			expectedStatus: http.StatusCreated,
			validateDB: func(t *testing.T, db *sql.DB, req CreatePostRequest) {
				// Query the database to verify the post was created
				var post query.Post
				err := db.QueryRow(`
					SELECT id, post_id, creator_did, text 
					FROM posts 
					WHERE post_id = $1 AND creator_did = $2`,
					req.PostID, req.CreatorDID,
				).Scan(&post.ID, &post.PostID, &post.CreatorDid, &post.Text)
				require.NoError(t, err)
				assert.Equal(t, req.PostID, post.PostID)
				assert.Equal(t, req.CreatorDID, post.CreatorDid)
				assert.Equal(t, req.Text, post.Text)

				// Verify tags were created
				rows, err := db.Query(`
					SELECT t.name 
					FROM tags t 
					JOIN post_tags pt ON t.id = pt.tag_id 
					WHERE pt.post_id = $1`,
					post.ID,
				)
				require.NoError(t, err)
				defer rows.Close()

				var tags []string
				for rows.Next() {
					var tag string
					require.NoError(t, rows.Scan(&tag))
					tags = append(tags, tag)
				}
				assert.ElementsMatch(t, req.Tags, tags)
			},
		},
		{
			name: "missing required fields",
			request: CreatePostRequest{
				Text: "",
				Tags: []string{"test"},
			},
			expectedStatus: http.StatusBadRequest,
			validateDB: func(t *testing.T, db *sql.DB, req CreatePostRequest) {
				// Verify no post was created
				var count int
				err := db.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&count)
				require.NoError(t, err)
				assert.Equal(t, 0, count)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean up database before each test
			_, err := db.Exec(`TRUNCATE posts, tags, post_tags CASCADE`)
			require.NoError(t, err)

			body, err := json.Marshal(tt.request)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/posts/create", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			server.handler.CreatePostWithTags(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.validateDB != nil {
				tt.validateDB(t, db, tt.request)
			}
		})
	}
}

func TestSearchPosts(t *testing.T) {
	server, db := setupTestServer(t)
	defer db.Close()

	// Create test data
	testPosts := []CreatePostRequest{
		{
			PostID:     "test-post-1",
			CreatorDID: "did:test:123",
			Text:      "Test post 1",
			Tags:      []string{"test", "integration"},
		},
		{
			PostID:     "test-post-2",
			CreatorDID: "did:test:456",
			Text:      "Test post 2",
			Tags:      []string{"test"},
		},
	}

	for _, post := range testPosts {
		params := query.CreatePostWithTagsParams{
			PostID:     post.PostID,
			CreatorDid: post.CreatorDID,
			CreatedAt:  time.Now(),
			Text:       post.Text,
			Tags:       post.Tags,
		}
		err := query.New(db).CreatePostWithTags(context.Background(), params)
		require.NoError(t, err)
	}

	tests := []struct {
		name           string
		request        SearchPostsRequest
		expectedStatus int
		validateResponse func(*testing.T, *http.Response)
	}{
		{
			name: "search by tags only",
			request: SearchPostsRequest{
				Tags:        []string{"test"},
				CreatedAfter: time.Now().Add(-24 * time.Hour),
				Limit:       50,
			},
			expectedStatus: http.StatusOK,
			validateResponse: func(t *testing.T, resp *http.Response) {
				var posts []query.GetRecentRootPostsByTagsRow
				err := json.NewDecoder(resp.Body).Decode(&posts)
				require.NoError(t, err)
				assert.Len(t, posts, 2)
				assert.Contains(t, []string{posts[0].Text, posts[1].Text}, "Test post 1")
				assert.Contains(t, []string{posts[0].Text, posts[1].Text}, "Test post 2")
			},
		},
		{
			name: "search by tags and creator",
			request: SearchPostsRequest{
				Tags:        []string{"test"},
				CreatorDIDs: []string{"did:test:123"},
				CreatedAfter: time.Now().Add(-24 * time.Hour),
				Limit:       50,
			},
			expectedStatus: http.StatusOK,
			validateResponse: func(t *testing.T, resp *http.Response) {
				var posts []query.GetRecentRootPostsByTagAndCreatorRow
				err := json.NewDecoder(resp.Body).Decode(&posts)
				require.NoError(t, err)
				assert.Len(t, posts, 1)
				assert.Equal(t, "Test post 1", posts[0].Text)
			},
		},
		{
			name: "no tags provided",
			request: SearchPostsRequest{
				Tags: []string{},
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, err := json.Marshal(tt.request)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/posts/search", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			server.handler.SearchPosts(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tt.expectedStatus, resp.StatusCode)
			if tt.validateResponse != nil {
				tt.validateResponse(t, resp)
			}
		})
	}
} 