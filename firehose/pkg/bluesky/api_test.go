package bluesky

import (
	"testing"
)

func TestResolveDIDToHandle(t *testing.T) {
	did := "did:plc:xo5agehbphpv6ax6exgrc5jd"
	expectedHandle := "peteuplink.bsky.social"

	handle, err := resolveDIDToHandle(did)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if handle != expectedHandle {
		t.Errorf("Expected handle %s, got %s", expectedHandle, handle)
	}
}
