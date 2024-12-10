CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(256) NOT NULL,
  description text NOT NULL,
  rules text NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_tags (
  community_id uuid REFERENCES communities(id) NOT NULL,
  tag varchar(100) NOT NULL,
  type varchar(20) NOT NULL,
  PRIMARY KEY (community_id, tag, type)
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid REFERENCES communities(id) NOT NULL,
  member_did varchar(256) NOT NULL,
  role varchar(20) NOT NULL,
  joined_at timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, member_did)
);
