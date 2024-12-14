-- name: GetRecentPostsByTag :many
SELECT p.id, p.created_at, t.name AS tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = $1 AND p.created_at < $2
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetRecentPostsByTags :many
SELECT DISTINCT p.id, p.created_at, t.name AS tag_name
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = ANY($1::text[]) AND p.created_at < $2
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetPostByID :one
SELECT p.id, p.created_at, COALESCE(JSON_AGG(t.name ORDER BY t.name), '[]'::json) AS tags
FROM posts p
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
WHERE p.id = $1
GROUP BY p.id;