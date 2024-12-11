import type { communities, communityMembers, communityTags } from './schema';

// Infer the types from the schema
export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;

export type CommunityMember = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;

export type CommunityTag = typeof communityTags.$inferSelect;
export type NewCommunityTag = typeof communityTags.$inferInsert;