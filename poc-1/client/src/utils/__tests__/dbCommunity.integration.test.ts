import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../db/schema';
import { createCommunity, getOwnedCommunities, deleteCommunity, getCommunityMembers } from '../../../../db/communities';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { setupTestAgent } from './testSetup';
import { setupTestDatabase, cleanupTestDatabase, clearTestData } from '../../../../server/__tests__/testSetup';

const execAsync = promisify(exec);

describe('Community Integration Tests', () => {
  let pool: Pool;
  let agent: BskyAgent;

  beforeAll(async () => {
    pool = await setupTestDatabase('dbcommunity_integration_test');
    agent = await setupTestAgent();
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool, 'dbcommunity_integration_test');
  });

  afterEach(async () => {
    await clearTestData(pool);
  });



  it('should create a new community', async () => {
    const db = drizzle(pool, { schema });
    
    const testCommunity = {
      name: 'Test Community',
      description: 'A test community',
      rules: 'Be nice',
      creatorDid: agent.session?.did!,
      hashtag: 'testcommunity',
      initialMembers: [{ did: agent.session?.did! }],
    };

    const community = await createCommunity(testCommunity, db);
    
    expect(community).toBeDefined();
    expect(community.name).toBe(testCommunity.name);
    expect(community.description).toBe(testCommunity.description);
    expect(community.rules).toBe(testCommunity.rules);
    expect(community.creatorDid).toBe(testCommunity.creatorDid);
    expect(community.hashtag).toBe(testCommunity.hashtag);

    // Verify members were added
    const members = await db.query.communityMembers.findMany({
      where: (members, { eq }) => eq(members.communityId, community.id)
    });
    expect(members).toHaveLength(1);
    expect(members[0].memberDid).toBe(testCommunity.creatorDid);
    expect(members[0].role).toBe('owner');
  });

  it('should get communities owned by a user', async () => {
    const db = drizzle(pool, { schema });
    const ownerDid = agent.session?.did!;

    // Create multiple communities
    const community1 = await createCommunity({
      name: 'Community 1',
      description: 'First test community',
      rules: 'Rules 1',
      creatorDid: ownerDid,
      hashtag: 'community1',
      initialMembers: [],
    }, db);

    const community2 = await createCommunity({
      name: 'Community 2',
      description: 'Second test community',
      rules: 'Rules 2',
      creatorDid: ownerDid,
      hashtag: 'community2',
      initialMembers: [],
    }, db);

    // Create a community owned by someone else
    await createCommunity({
      name: 'Other Community',
      description: 'Not owned by test user',
      rules: 'Other rules',
      creatorDid: 'did:plc:other',
      hashtag: 'othercommunity',
      initialMembers: [],
    }, db);

    const ownedCommunities = await getOwnedCommunities(ownerDid, db);
    console.log('Owned communities:', JSON.stringify(ownedCommunities, null, 2));

    expect(ownedCommunities).toHaveLength(2);
    expect(ownedCommunities.map(c => c.name).sort()).toEqual(['Community 1', 'Community 2']);
    
    // Verify community structure
    const firstCommunity = ownedCommunities.find(c => c.hashtag === 'community1');
    expect(firstCommunity).toBeDefined();
    expect(firstCommunity).toHaveProperty('id');
    expect(firstCommunity).toHaveProperty('createdAt');
  });

  it('should delete a community and its members', async () => {
    const db = drizzle(pool, { schema });
    const ownerDid = agent.session?.did!;

    // Create a community with multiple members
    const community = await createCommunity({
      name: 'Community to Delete',
      description: 'This community will be deleted',
      rules: 'Temporary rules',
      creatorDid: ownerDid,
      hashtag: 'deleteme',
      initialMembers: [
        { did: 'did:plc:member1' },
        { did: 'did:plc:member2' },
      ],
    }, db);

    // Verify community and members exist
    let members = await db.query.communityMembers.findMany({
      where: (members, { eq }) => eq(members.communityId, community.id)
    });
    expect(members).toHaveLength(3); // owner + 2 members

    // Delete the community
    const deletedCommunity = await deleteCommunity(community.id, db);
    expect(deletedCommunity).toBeDefined();
    expect(deletedCommunity!.name).toBe('Community to Delete');

    // Verify community and members are gone
    members = await db.query.communityMembers.findMany({
      where: (members, { eq }) => eq(members.communityId, community.id)
    });
    expect(members).toHaveLength(0);

    const communities = await db.query.communities.findMany({
      where: (communities, { eq }) => eq(communities.id, community.id)
    });
    expect(communities).toHaveLength(0);
  });

  it('should handle deleting non-existent community', async () => {
    const db = drizzle(pool, { schema });
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const result = await deleteCommunity(nonExistentId, db);
    expect(result).toBeUndefined();
  });

  it('should get community members correctly', async () => {
    const db = drizzle(pool, { schema });
    const ownerDid = agent.session?.did!;
    const member1Did = 'did:plc:member1';
    const member2Did = 'did:plc:member2';
    const nonMemberDid = 'did:plc:nonmember';

    // Create a community with initial members
    const community = await createCommunity({
      name: 'Test Community',
      description: 'A test community',
      rules: 'Be nice',
      creatorDid: ownerDid,
      hashtag: 'testcommunity',
      initialMembers: [
        { did: member1Did },
        { did: member2Did }
      ],
    }, db);

    // Test cases
    
    // 1. Owner should be able to get members
    const membersForOwner = await getCommunityMembers('testcommunity', ownerDid, db);
    expect(membersForOwner).not.toBeNull();
    expect(membersForOwner).toHaveLength(3); // owner + 2 members
    expect(membersForOwner).toContain(ownerDid);
    expect(membersForOwner).toContain(member1Did);
    expect(membersForOwner).toContain(member2Did);

    // 2. Member should be able to get members
    const membersForMember = await getCommunityMembers('testcommunity', member1Did, db);
    expect(membersForMember).not.toBeNull();
    expect(membersForMember).toHaveLength(3);
    expect(membersForMember).toContain(ownerDid);
    expect(membersForMember).toContain(member1Did);
    expect(membersForMember).toContain(member2Did);

    // 3. Non-member should not be able to get members
    const membersForNonMember = await getCommunityMembers('testcommunity', nonMemberDid, db);
    expect(membersForNonMember).toBeNull();

    // 4. Non-existent community should return null
    const membersForNonExistentCommunity = await getCommunityMembers('nonexistent', ownerDid, db);
    expect(membersForNonExistentCommunity).toBeNull();
  });
});
