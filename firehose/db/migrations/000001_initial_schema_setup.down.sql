-- Drop composite index on post_tags
DROP INDEX IF EXISTS idx_post_tags_post_id_tag_id;

-- Drop index on tags name
DROP INDEX IF EXISTS idx_tags_name;

-- Drop index on posts created_at
DROP INDEX IF EXISTS idx_posts_created_at;

-- Drop post_tags table
DROP TABLE IF EXISTS post_tags;

-- Drop tags table
DROP TABLE IF EXISTS tags;

-- Drop posts table
DROP TABLE IF EXISTS posts;
