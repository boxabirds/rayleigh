import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../db/schema';
import { createCommunity } from '../../../../db/communities';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { setupTestAgent } from './testSetup';

const execAsync = promisify(exec);

describe('Community Integration Tests', () => {
  let pool: Pool;
  let agent: BskyAgent;
  const TEST_DB = 'rayleigh_test';

  beforeAll(async () => {
    // Create test database
    await execAsync(`dropdb --if-exists ${TEST_DB}`);
    await execAsync(`createdb ${TEST_DB}`);
    
    // Run migrations
    const migrationPool = new Pool({
      database: TEST_DB,
      host: 'localhost',
      port: 5432,
      user: 'julian',
    });
    
    // Read and execute migration files
    const migrationsDir = path.join(__dirname, '../../../../db/migrations');
    const migrationFiles = await fs.readdir(migrationsDir);
    
    for (const file of migrationFiles.sort()) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      await migrationPool.query(sql);
    }
    await migrationPool.end();

    // Set up test database connection
    pool = new Pool({
      database: TEST_DB,
      host: 'localhost',
      port: 5432,
      user: 'julian',
    });

    // Set up Bluesky agent
    agent = await setupTestAgent();
  });

  afterAll(async () => {
    await pool.end();
    await execAsync(`dropdb ${TEST_DB}`);
  });

  it('should create a new community', async () => {
    const db = drizzle(pool, { schema });
    
    const testCommunity = {
      name: 'Test Community',
      description: 'A test community',
      rules: 'Be nice',
      creatorDid: agent.session?.did!,
      postTags: ['test'],
      channels: ['general'],
      initialMembers: [{ did: agent.session?.did! }],
    };

    const community = await createCommunity(testCommunity, db);
    
    expect(community).toBeDefined();
    expect(community.name).toBe(testCommunity.name);
    expect(community.description).toBe(testCommunity.description);
    expect(community.rules).toBe(testCommunity.rules);
    expect(community.creatorDid).toBe(testCommunity.creatorDid);

    // Verify tags were created
    const tags = await db.query.communityTags.findMany({
      where: (tags, { eq }) => eq(tags.communityId, community.id)
    });
    expect(tags).toHaveLength(2); // 1 post tag + 1 channel

    // Verify members were added
    const members = await db.query.communityMembers.findMany({
      where: (members, { eq }) => eq(members.communityId, community.id)
    });
    expect(members).toHaveLength(1);
    expect(members[0].memberDid).toBe(testCommunity.creatorDid);
    expect(members[0].role).toBe('owner');
  });
});
