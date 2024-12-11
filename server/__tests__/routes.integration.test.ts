import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { createCommunity } from '../../db/communities';
import { registerRoutes } from '../routes';
import { BskyAgent } from '@atproto/api';
import { setupTestDatabase, cleanupTestDatabase, clearTestData, setupTestAgent } from './testSetup';

describe('API Routes Integration Tests', () => {
  let pool: Pool;
  let agent: BskyAgent;
  let app: express.Application;
  let databaseName: string;

  beforeAll(async () => {
    databaseName = 'routes_integration_test';
    pool = await setupTestDatabase(databaseName);
    agent = await setupTestAgent();
    
    // Set up Express app with test database
    app = express();
    app.use(express.json());
    const db = drizzle(pool, { schema });
    registerRoutes(app, db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool, databaseName);
  });

  afterEach(async () => {
    await clearTestData(pool);
  });
  describe('GET /api/community/owner', () => {
    it('should return owned communities', async () => {
      const db = drizzle(pool, { schema });
      const ownerDid = agent.session?.did!;

      // Create test communities using createCommunity function
      await createCommunity({
        name: 'Test Community 1',
        description: 'Description 1',
        rules: 'Rules 1',
        hashtag: 'test1',
        creatorDid: ownerDid,
        initialMembers: [],
      }, db);

      await createCommunity({
        name: 'Test Community 2',
        description: 'Description 2',
        rules: 'Rules 2',
        hashtag: 'test2',
        creatorDid: ownerDid,
        initialMembers: [],
      }, db);

      // Test the API endpoint
      const response = await request(app)
        .get('/api/community/owner')
        .query({ did: ownerDid });

      console.log('Response body:', response.body);
      console.log('Response status:', response.status);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((c: any) => c.name).sort()).toEqual([
        'Test Community 1',
        'Test Community 2'
      ]);
    });

    it('should return 400 if did is missing', async () => {
      const response = await request(app)
        .get('/api/community/owner')
        .query({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required did parameter'
      });
    });
  });
});