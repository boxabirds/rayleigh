package bluesky

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
)

// API wrappers

// Function to resolve DID to handle using Bluesky's API
func resolveDIDToHandle(did string) (string, error) {
	apiURL := "https://public.bsky.social/xrpc/com.atproto.identity.resolveHandle"
	params := url.Values{}
	params.Add("did", did)
	apiURL += "?" + params.Encode()

	resp, err := http.Get(apiURL)
	if err != nil {
		return "", fmt.Errorf("failed to make API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status: %s", resp.Status)
	}

	var result struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode API response: %w", err)
	}

	return result.Handle, nil
}

// Function to construct the post URL
func constructPostURL(handle, postID string) string {
	return fmt.Sprintf("https://bsky.app/profile/%s/post/%s", handle, postID)
}

func main() {
	did := "did:plc:exampledid"
	postID := "examplepostid"

	// Step 1: Resolve the DID to a handle
	handle, err := resolveDIDToHandle(did)
	if err != nil {
		log.Fatalf("Error resolving DID to handle: %v", err)
	}

	// Step 2: Construct the post URL
	postURL := constructPostURL(handle, postID)

	fmt.Printf("Post URL: %s\n", postURL)
}
