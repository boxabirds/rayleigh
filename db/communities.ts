import { db, communities, communityTags, communityMembers } from './';
import { and, eq } from 'drizzle-orm';

export interface CreateCommunityInput {
  name: string;
  description: string;
  rules: string;
  creatorDid: string;
  postTags: string[];
  channels: string[];
  initialMembers: Array<{ did: string }>;
}

export async function createCommunity(input: CreateCommunityInput) {
  return await db.transaction(async (tx) => {
    // Create the community
    const [community] = await tx
      .insert(communities)
      .values({
        name: input.name,
        description: input.description,
        rules: input.rules,
        creator_did: input.creatorDid,
      })
      .returning();

    // Add post tags
    if (input.postTags.length > 0) {
      await tx.insert(communityTags).values(
        input.postTags.map((tag) => ({
          community_id: community.id,
          tag,
          type: 'post',
        }))
      );
    }

    // Add channels
    if (input.channels.length > 0) {
      await tx.insert(communityTags).values(
        input.channels.map((channel) => ({
          community_id: community.id,
          tag: channel,
          type: 'channel',
        }))
      );
    }

    // Add creator and initial members
    const memberInserts = [
      {
        community_id: community.id,
        member_did: input.creatorDid,
        role: 'owner',
      },
      ...input.initialMembers.map((member) => ({
        community_id: community.id,
        member_did: member.did,
        role: 'member',
      })),
    ];

    await tx.insert(communityMembers).values(memberInserts);

    // Return the created community with its tags and members
    const tags = await tx
      .select()
      .from(communityTags)
      .where(eq(communityTags.community_id, community.id));

    const members = await tx
      .select()
      .from(communityMembers)
      .where(eq(communityMembers.community_id, community.id));

    return {
      ...community,
      postTags: tags.filter((t) => t.type === 'post').map((t) => t.tag),
      channels: tags.filter((t) => t.type === 'channel').map((t) => t.tag),
      members: members.map((m) => ({
        did: m.member_did,
        role: m.role,
      })),
      tag: community.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    };
  });
}

export async function getCommunity(id: string) {
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, id),
  });

  if (!community) return null;

  const tags = await db
    .select()
    .from(communityTags)
    .where(eq(communityTags.community_id, community.id));

  const members = await db
    .select()
    .from(communityMembers)
    .where(eq(communityMembers.community_id, community.id));

  return {
    ...community,
    postTags: tags.filter((t) => t.type === 'post').map((t) => t.tag),
    channels: tags.filter((t) => t.type === 'channel').map((t) => t.tag),
    members: members.map((m) => ({
      did: m.member_did,
      role: m.role,
    })),
    tag: community.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  };
}
