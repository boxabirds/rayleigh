
-- name: GetRecentPostsByTags :many
-- params: named
-- $1: TagNames
-- $2: Before
-- $3: Limit
-- $4: Offset
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
-- $6: tags
WITH new_post AS (
    INSERT INTO posts (post_id, creator_did, created_at, text, data)
    VALUES ($1, $2, $3, $4, $5)
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