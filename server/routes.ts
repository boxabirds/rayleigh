import type { Express } from "express";
import { createCommunity } from '../db/communities';

export function registerRoutes(app: Express) {
  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Community endpoints
  app.post('/api/communities', async (req, res) => {
    try {
      const { name, postTags, description, rules, channels, initialMembers, creatorDid } = req.body;
      
      // Validate input data
      if (!name || !creatorDid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create the community in the database
      const community = await createCommunity({
        name,
        description,
        rules,
        creatorDid,
        postTags: postTags || [],
        channels: channels || [],
        initialMembers: initialMembers || [],
      });

      res.status(201).json(community);
    } catch (error) {
      console.error('Error creating community:', error);
      res.status(500).json({ error: 'Failed to create community' });
    }
  });
}
