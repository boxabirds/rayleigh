package bluesky

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/require"
)

func TestResolveDIDToHandle(t *testing.T) {
	did := "did:plc:xo5agehbphpv6ax6exgrc5jd"
	expectedHandle := "peteuplink.bsky.social"

	err := godotenv.Load()
	require.NoError(t, err, "Failed to load .env file")

	// Check if environment variables are set
	blueskyHandle := os.Getenv("BSKY_IDENTIFIER")
	blueskyAppkey := os.Getenv("BSKY_APP_PASSWORD")
	require.NotEmpty(t, blueskyHandle, "BSKY_IDENTIFIER is not set")
	require.NotEmpty(t, blueskyAppkey, "BSKY_APP_PASSWORD is not set")

	client, err := SignIn(blueskyHandle, blueskyAppkey)

	handle, err := resolveDIDToHandle(client, did)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if handle != expectedHandle {
		t.Errorf("Expected handle %s, got %s", expectedHandle, handle)
	}
}
