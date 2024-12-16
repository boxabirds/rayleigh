-- Migration to create posts, tags, and post_tags tables

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(255) NOT NULL,
    creator_did VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    text TEXT NOT NULL,
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_creator_did ON posts(creator_did);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_post_id ON posts(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_creator_did_created_at ON posts(creator_did, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_creator_did_post_id ON posts(creator_did, id);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id_post_id ON post_tags(tag_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id_created_at ON post_tags (tag_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
