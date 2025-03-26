
-- name: GetRecentRootPostsByTags :many
SELECT DISTINCT p.*, t.name AS tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = ANY(@tag_names::text[]) 
  AND p.created_at >= @created_after
ORDER BY p.created_at DESC
LIMIT @row_limit OFFSET @row_offset;

-- name: GetRecentRootPostsByTagAndCreator :many
SELECT p.*, t.name AS tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = ANY(@tag_names::text[])
  AND p.created_at >= @created_after
  AND p.creator_did = ANY(@creator_dids::text[])
ORDER BY p.created_at DESC
LIMIT @row_limit OFFSET @row_offset;

-- name: GetPostById :one
SELECT * FROM posts WHERE id = $1;

-- name: CreatePostWithTags :exec
-- $6: tags
WITH new_post AS (
    INSERT INTO posts (post_id, creator_did, created_at, text)
    VALUES ($1, $2, $3, $4)
    RETURNING id
),
inserted_tags AS (
    INSERT INTO tags (name)
    SELECT unnest(sqlc.arg('tags')::text[])
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
),
existing_tags AS (
    SELECT id, name
    FROM tags
    WHERE name = ANY(sqlc.arg('tags')::text[])
)
INSERT INTO post_tags (post_id, tag_id)
SELECT new_post.id, tag_id
FROM (
    SELECT id AS tag_id FROM inserted_tags
    UNION
    SELECT id AS tag_id FROM existing_tags
) AS all_tags
JOIN new_post ON true;