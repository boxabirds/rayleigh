package bluesky

import (
	"context"
	"fmt"

	"github.com/bluesky-social/indigo/xrpc"
)

// API wrappers

// Function to resolve DID to handle using Bluesky's API
func resolveDIDToHandle(client *xrpc.Client, did string) (string, error) {
	ctx := context.Background()

	// Procedure name (mapped to the endpoint `/xrpc/com.atproto.identity.resolveHandle`)
	procedure := "com.atproto.identity.resolveHandle"

	// Authentication token (AccessJwt)
	authToken := client.Auth.AccessJwt
	if authToken == "" {
		return "", fmt.Errorf("client.Auth.AccessJwt is empty; ensure the client is authenticated")
	}

	// Query parameters
	params := map[string]interface{}{
		"did": did,
	}

	// Result structure to hold the API response
	var result struct {
		Handle string `json:"handle"`
	}

	// Make the authenticated request
	if err := client.Do(ctx, xrpc.Query, procedure, authToken, params, nil, &result); err != nil {
		return "", fmt.Errorf("failed to resolve DID to handle: %w", err)
	}

	// Return the handle from the response
	return result.Handle, nil
}

// Function to construct the post URL
func constructPostURL(handle, postID string) string {
	return fmt.Sprintf("https://bsky.app/profile/%s/post/%s", handle, postID)
}
