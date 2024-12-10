import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { BskyAgent } from '@atproto/api';
import { setupTestAgent } from '../../client/src/utils/__tests__/testSetup';

const execAsync = promisify(exec);
const TEST_DB = 'rayleigh_test';

export async function setupTestDatabase() {
  // Drop and recreate database
  await execAsync(`dropdb --if-exists ${TEST_DB}`);
  await execAsync(`createdb ${TEST_DB}`);
  
  // Run migrations
  const migrationPool = new Pool({
    database: TEST_DB,
    host: 'localhost',
    port: 5432,
    user: 'postgres',
  });

  try {
    const migrationsDir = path.join(__dirname, '../../db/migrations');
    const migrationFiles = await fs.readdir(migrationsDir);
    
    for (const file of migrationFiles.sort()) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      await migrationPool.query(sql);
    }
  } finally {
    await migrationPool.end();
  }

  // Return main pool
  return new Pool({
    database: TEST_DB,
    host: 'localhost',
    port: 5432,
    user: 'postgres',
  });
}

export async function cleanupTestDatabase(pool: Pool) {
  await pool.end();
  await execAsync(`dropdb --if-exists ${TEST_DB}`);
}

export async function clearTestData(pool: Pool) {
  const db = drizzle(pool, { schema });
  await db.delete(schema.communityMembers);
  await db.delete(schema.communities);
}

export { setupTestAgent };