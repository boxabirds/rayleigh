import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

// Create a PostgreSQL connection pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rayleigh',
});

// Create a drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from './schema';
