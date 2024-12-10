import type { Express } from "express";
import { createCommunity, getCommunity, getOwnedCommunities } from '../db/communities';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

export function registerRoutes(app: Express, testDb?: NodePgDatabase<typeof schema>) {
  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Community endpoints
  app.post('/api/communities', async (req, res) => {
    try {
      console.log('POST /api/communities received');
      const { name, hashtag, description, rules, initialMembers, creatorDid } = req.body;
      
      console.log('Creating community:', {
        name,
        hashtag,
        description,
        rules,
        initialMembers,
        creatorDid,
      });
      
      // Validate input data
      if (!name || !hashtag || !creatorDid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create the community in the database
      const community = await createCommunity({
        name,
        description,
        rules,
        creatorDid,
        hashtag,
        initialMembers: initialMembers || [],
      }, testDb);

      console.log('Community created:', community);
      res.status(201).json(community);
    } catch (error) {
      console.error('Error creating community:', error);
      // Type guard for PostgreSQL error
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        res.status(409).json({ error: 'A community with this hashtag already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create community' });
      }
    }
  });

  app.get('/api/communities/:hashtag', async (req, res) => {
    try {
      const { hashtag } = req.params;
      const community = await getCommunity(hashtag, testDb);
      
      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }
      
      res.json(community);
    } catch (error) {
      console.error('Error getting community:', error);
      res.status(500).json({ error: 'Failed to get community' });
    }
  });

  // Get communities owned by a user
  app.get('/api/community/owner', async (req, res) => {
    try {
      const ownerDid = req.query.did as string;
      if (!ownerDid) {
        return res.status(400).json({ error: 'Missing required did parameter' });
      }

      console.log('Getting owned communities for did:', ownerDid);
      const communities = await getOwnedCommunities(ownerDid, testDb);
      console.log('Found communities:', communities);
      res.json(communities);
    } catch (error) {
      console.error('Error getting owned communities:', error);
      res.status(500).json({ error: 'Failed to get owned communities' });
    }
  });
}
