package bluesky

import (
	"context"
	"fmt"
	"log"

	"github.com/bluesky-social/indigo/api/atproto"
	"github.com/bluesky-social/indigo/xrpc"
)

// SignIn authenticates using the Bluesky API with credentials from the environment
func SignIn(handle string, appPassword string) (*xrpc.Client, error) {
	ctx := context.Background()
	client := &xrpc.Client{
		Host: "https://bsky.social",
	}
	session, err := atproto.ServerCreateSession(ctx, client, &atproto.ServerCreateSession_Input{
		Identifier: handle,
		Password:   appPassword,
	})
	if err != nil {
		log.Fatalf("failed to create session: %v", err)
		return nil, err
	}

	// Use the access token for authenticated requests
	client.Auth = &xrpc.AuthInfo{
		AccessJwt:  session.AccessJwt,
		RefreshJwt: session.RefreshJwt,
		Handle:     session.Handle,
		Did:        session.Did,
	}

	fmt.Println("Successfully authenticated as:", session.Handle)
	return client, nil
}
