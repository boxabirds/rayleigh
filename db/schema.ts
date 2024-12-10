import { pgTable, text, uuid, timestamp, varchar } from 'drizzle-orm/pg-core';

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description').notNull(),
  rules: text('rules').notNull(),
  creatorDid: varchar('creator_did', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const communityTags = pgTable('community_tags', {
  communityId: uuid('community_id').references(() => communities.id).notNull(),
  tag: varchar('tag', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'post' or 'channel'
});

export const communityMembers = pgTable('community_members', {
  communityId: uuid('community_id').references(() => communities.id).notNull(),
  memberDid: varchar('member_did', { length: 256 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'owner', 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});
