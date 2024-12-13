-- Add index on member_did for better query performance
CREATE INDEX IF NOT EXISTS idx_community_members_member_did ON community_members (member_did);