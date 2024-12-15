
-- name: GetRecentPostsByTags :many
SELECT DISTINCT p.id, p.created_at, t.name AS tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = ANY($1::text[]) AND p.created_at < $2
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetRecentPostsByTagAndCreator :many
SELECT p.*
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = ANY($1::text[])
  AND p.created_at >= $2
  AND p.creator_did = ANY($3::text[])
ORDER BY p.created_at DESC
LIMIT $4;

-- name: GetPostById :one
SELECT * FROM posts WHERE id = $1;

-- name: CreatePostWithTags :exec
-- $5: tags
WITH new_post AS (
    INSERT INTO posts (creator_did, created_at, text, data)
    VALUES ($1, $2, $3, $4)
    RETURNING id
)
INSERT INTO post_tags (post_id, tag_id)
SELECT new_post.id, tags.id
FROM unnest(sqlc.arg('tags')::text[]) AS tag_names
JOIN tags ON tags.name = tag_names
JOIN new_post ON true;
