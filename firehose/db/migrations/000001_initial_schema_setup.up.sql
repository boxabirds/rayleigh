-- Create posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create post_tags join table
CREATE TABLE post_tags (
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Index for efficient retrieval of posts by creation time
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Index for efficient retrieval of tags by name
CREATE UNIQUE INDEX idx_tags_name ON tags(name);

-- Composite index for efficient join operations between posts and tags
CREATE INDEX idx_post_tags_post_id_tag_id ON post_tags(post_id, tag_id);