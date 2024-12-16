package jetstream

import "time"

type PostCommitRecord struct {
	Type      string    `json:"$type"`
	CreatedAt time.Time `json:"createdAt"`
	Facets    []Facet   `json:"facets"`
	Langs     []string  `json:"langs"`
	Reply     *Reply    `json:"reply,omitempty"` // Optional field
	Text      string    `json:"text"`
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
