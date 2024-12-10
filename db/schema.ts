import { pgTable, text, uuid, timestamp, varchar, unique, index } from 'drizzle-orm/pg-core';

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description').notNull(),
  rules: text('rules').notNull(),
  hashtag: varchar('hashtag', { length: 100 }).notNull(),
  creatorDid: varchar('creator_did', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hashtagIdx: index('hashtag_idx').on(table.hashtag),
  uniqueHashtag: unique('unique_hashtag').on(table.hashtag)
}));

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
