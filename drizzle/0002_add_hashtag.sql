-- Clear existing data
TRUNCATE TABLE community_members CASCADE;
TRUNCATE TABLE community_tags CASCADE;
TRUNCATE TABLE communities CASCADE;

-- Drop the community_tags table since we're moving to a single hashtag
DROP TABLE IF EXISTS community_tags;

-- Add hashtag column to communities
ALTER TABLE communities ADD COLUMN hashtag varchar(100) NOT NULL;

-- Add index and unique constraint on hashtag
CREATE UNIQUE INDEX unique_hashtag ON communities (hashtag);
CREATE INDEX hashtag_idx ON communities (hashtag);
