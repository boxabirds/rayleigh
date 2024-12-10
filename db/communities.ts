import { db as defaultDb, communities, communityMembers } from './';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export interface CreateCommunityInput {
  name: string;
  description: string;
  rules: string;
  creatorDid: string;
  hashtag: string;
  initialMembers: Array<{ did: string }>;
}

export async function createCommunity(input: CreateCommunityInput, testDb?: NodePgDatabase<typeof schema>) {
  const db = testDb || defaultDb;
  try {
    return await db.transaction(async (tx) => {
      console.log('Creating community with input:', input);
      
      // Create the community
      const [community] = await tx
        .insert(communities)
        .values({
          name: input.name,
          description: input.description,
          rules: input.rules,
          hashtag: input.hashtag,
          creatorDid: input.creatorDid,
        })
        .returning();

      console.log('Created community:', community);

      // Add initial members
      if (input.initialMembers.length > 0) {
        console.log('Adding initial members:', input.initialMembers);
        await tx.insert(communityMembers).values(
          input.initialMembers.map((member) => ({
            communityId: community.id,
            memberDid: member.did,
            role: member.did === input.creatorDid ? 'owner' : 'member',
          }))
        );
      }

      // Always add creator as owner if not in initial members
      if (!input.initialMembers.some(m => m.did === input.creatorDid)) {
        console.log('Adding creator as owner');
        await tx.insert(communityMembers).values({
          communityId: community.id,
          memberDid: input.creatorDid,
          role: 'owner',
        });
      }

      return community;
    });
  } catch (error) {
    console.error('Error in createCommunity:', error);
    throw error;
  }
}

export async function getCommunity(hashtag: string) {
  try {
    const [community] = await defaultDb
      .select()
      .from(communities)
      .where(eq(communities.hashtag, hashtag))
      .limit(1);

    if (!community) {
      return null;
    }

    const members = await defaultDb
      .select()
      .from(communityMembers)
      .where(eq(communityMembers.communityId, community.id));

    return {
      ...community,
      members,
    };
  } catch (error) {
    console.error('Error in getCommunity:', error);
    throw error;
  }
}

export async function getOwnedCommunitiesWithDb(
  ownerDid: string,
  db: NodePgDatabase<typeof schema>
) {
  try {
    const ownedCommunities = await db
      .select({
        id: communities.id,
        name: communities.name,
        hashtag: communities.hashtag,
        createdAt: communities.createdAt,
      })
      .from(communities)
      .innerJoin(
        communityMembers,
        and(
          eq(communities.id, communityMembers.communityId),
          eq(communityMembers.memberDid, ownerDid),
          eq(communityMembers.role, 'owner')
        )
      )
      .orderBy(communities.createdAt);

    return ownedCommunities;
  } catch (error) {
    console.error('Error in getOwnedCommunities:', error);
    throw error;
  }
}

export async function deleteCommunityWithDb(
  communityId: string,
  db: NodePgDatabase<typeof schema>
) {
  try {
    // Delete members first due to foreign key constraint
    await db
      .delete(communityMembers)
      .where(eq(communityMembers.communityId, communityId));

    // Then delete the community
    const [deletedCommunity] = await db
      .delete(communities)
      .where(eq(communities.id, communityId))
      .returning();

    return deletedCommunity;
  } catch (error) {
    console.error('Error in deleteCommunity:', error);
    throw error;
  }
}

export async function getOwnedCommunities(
  ownerDid: string,
  db: NodePgDatabase<typeof schema> = defaultDb
) {
  try {
    const query = db
      .select({
        id: communities.id,
        name: communities.name,
        hashtag: communities.hashtag,
        createdAt: communities.createdAt,
      })
      .from(communities)
      .innerJoin(
        communityMembers,
        and(
          eq(communities.id, communityMembers.communityId),
          eq(communityMembers.memberDid, ownerDid),
          eq(communityMembers.role, 'owner')
        )
      )
      .orderBy(communities.createdAt);

    // Log the SQL query
    const sql = query.toSQL();
    console.log('Generated SQL:', sql.sql);
    console.log('SQL parameters:', sql.params);

    const ownedCommunities = await query;
    return ownedCommunities;
  } catch (error) {
    console.error('Error in getOwnedCommunities:', error);
    throw error;
  }
}
export async function deleteCommunity(
  communityId: string,
  db: NodePgDatabase<typeof schema> = defaultDb
) {
  try {
    // Delete members first due to foreign key constraint
    await db
      .delete(communityMembers)
      .where(eq(communityMembers.communityId, communityId));

    // Then delete the community
    const [deletedCommunity] = await db
      .delete(communities)
      .where(eq(communities.id, communityId))
      .returning();

    return deletedCommunity;
  } catch (error) {
    console.error('Error in deleteCommunity:', error);
    throw error;
  }
}
