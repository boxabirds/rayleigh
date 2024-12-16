package jetstream

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/bluesky-social/jetstream/pkg/models"
)

type PostCommitRecord struct {
	Type      string    `json:"$type"`
	CreatedAt time.Time `json:"createdAt"`
	Facets    []Facet   `json:"facets"`
	Langs     []string  `json:"langs"`
	Reply     *Reply    `json:"reply,omitempty"` // Optional field
	Text      string    `json:"text"`
	Tags      []string  // this is a calculated field derived from the Facets
}

type Ref struct {
	Link string `json:"$link"`
}

type Facet struct {
	Features []Feature `json:"features"`
	Index    Index     `json:"index"`
}

type Feature struct {
	Type string `json:"$type"`
	Tag  string `json:"tag,omitempty"`
	URI  string `json:"uri,omitempty"`
}

type Index struct {
	ByteEnd   int `json:"byteEnd"`
	ByteStart int `json:"byteStart"`
}

type Reply struct {
	Parent CIDURI `json:"parent"`
	Root   CIDURI `json:"root"`
}

type CIDURI struct {
	CID string `json:"cid"`
	URI string `json:"uri"`
}

func ExtractTags(facets []Facet) []string {
	tags := make([]string, 0)

	for _, facet := range facets {
		for _, feature := range facet.Features {
			if feature.Type == "app.bsky.richtext.facet#tag" && feature.Tag != "" {
				tags = append(tags, feature.Tag)
			}
		}
	}

	return tags
}

func ExtractPost(evt *models.Event) (*PostCommitRecord, error) {

	var post PostCommitRecord
	// Unmarshal the data into the Post struct

	if err := json.Unmarshal(evt.Commit.Record, &post); err != nil {
		return nil, fmt.Errorf("failed to unmarshal post commit data: %w", err)
	}

	post.Tags = ExtractTags(post.Facets)
	return &post, nil

}
