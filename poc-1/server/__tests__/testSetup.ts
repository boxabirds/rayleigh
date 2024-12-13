import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { BskyAgent } from '@atproto/api';
import { setupTestAgent } from '../../client/src/utils/__tests__/testSetup';

// PostgreSQL error codes not covered by pg-error-codes
enum PgErrorCode {
  DUPLICATE_DATABASE = '42P04',
}

const execAsync = promisify(exec);

export async function setupTestDatabase(dbName: string = 'rayleigh_test') {
  let migrationPool: Pool | null = null;
  let pool: Pool | null = null;
  
  try {
    // First ensure the database is dropped
    console.log(`Dropping existing test database ${dbName} if it exists...`);
    await execAsync(`dropdb --if-exists ${dbName}`);
    console.log(`Database ${dbName} dropped successfully, or did not exist.`);
    
    // Create fresh test database
    console.log(`Creating a fresh test database ${dbName}...`);
    await execAsync(`createdb ${dbName}`);
    
    // Run migrations
    migrationPool = new Pool({
      database: dbName,
      host: 'localhost',
      port: 5432,
      user: 'postgres',
    });
    
    // Read and execute migration files
    const migrationsDir = path.join(__dirname, '../../db/migrations');
    const migrationFiles = await fs.readdir(migrationsDir);
    
    for (const file of migrationFiles.sort()) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      await migrationPool.query(sql);
    }
    
    // Create and return the main test pool
    pool = new Pool({
      database: dbName,
      host: 'localhost',
      port: 5432,
      user: 'postgres',
    });
    
    return pool;
  } catch (error: unknown) {
    // If anything fails, try to clean up what we can
    if (pool) await pool.end().catch(() => {});
    if (migrationPool) await migrationPool.end().catch(() => {});
    await execAsync(`dropdb --if-exists ${dbName}`).catch(() => {});
    throw error;
  } finally {
    // Always close migration pool if it exists
    if (migrationPool) await migrationPool.end().catch(() => {});
  }
}

export async function cleanupTestDatabase(pool: Pool | null, dbName: string = 'rayleigh_test') {
  if (!pool) return;
  
  try {
    await pool.end();
  } catch (error: unknown) {
    console.error('Error closing pool:', error);
  }
  
  try {
    await execAsync(`dropdb --if-exists ${dbName}`);
  } catch (error: unknown) {
    console.error('Error dropping test database:', error);
  }
}

export async function clearTestData(pool: Pool) {
  const db = drizzle(pool, { schema });
  await db.delete(schema.communityMembers);
  await db.delete(schema.communities);
}

export { setupTestAgent };

async function createTestDatabase(dbName: string = 'rayleigh_test') {
  // Connect with no specific database to create the test db
  const setupPool = new Pool({
    database: undefined,
    host: 'localhost',
    port: 5432,
    user: 'postgres',
  });

  try {
    await setupPool.query(`CREATE DATABASE ${dbName}`);
  } catch (error: any) {
    if (error instanceof Error && (error as any).code !== PgErrorCode.DUPLICATE_DATABASE) {
      throw error;
    }
  } finally {
    await setupPool.end();
  }
}