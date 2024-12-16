package bluesky

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSignIn(t *testing.T) {
	// this requires the .env to be in the same directory 🤦‍♂️
	err := godotenv.Load()
	require.NoError(t, err, "Failed to load .env file")

	// Check if environment variables are set
	blueskyHandle := os.Getenv("BSKY_IDENTIFIER")
	blueskyAppkey := os.Getenv("BSKY_APP_PASSWORD")
	require.NotEmpty(t, blueskyHandle, "BSKY_IDENTIFIER is not set")
	require.NotEmpty(t, blueskyAppkey, "BSKY_APP_PASSWORD is not set")

	// Optionally, perform a simple operation to verify client functionality

	client, err := SignIn(blueskyHandle, blueskyAppkey)
	assert.NoError(t, err, "Failed to fetch profile")
	assert.NotNil(t, client, "Profile should not be nil")

	// Clean up
	//defer client.Close()
}
