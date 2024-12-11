import { describe, it, expect } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { loadThread } from '../threadUtils';
import { PostRecord } from '../../types';
import { setupTestAgent } from './testSetup';
import { TEST_TAG, KNOWN_POSTS, getPostUri } from './fixtures/integrationTestData';

describe('threadUtils integration', () => {
  it('should load an existing thread', async () => {
    try {
      console.log('Setting up agent for test...');
      const agent = await setupTestAgent();
      console.log('Agent setup complete. Agent authenticated:', agent.session !== null);

      // Use the parent post from our test data
      const postUri = getPostUri(KNOWN_POSTS.parents[0]);
      console.log('Attempting to load thread with URI:', postUri);
      
      // Test with full at:// format
      const thread = await loadThread(agent, postUri.replace('at://', ''));

      expect(thread).toBeDefined();
      expect(thread.rootPost.uri).toBe(postUri);
      expect(thread.rootPost.record).toBeDefined();
      expect((thread.rootPost.record as PostRecord).text).toContain(`#${TEST_TAG}`);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, { timeout: 60000 });

  it('should handle encoded URIs', async () => {
    try {
      console.log('Setting up agent for test...');
      const agent = await setupTestAgent();
      console.log('Agent setup complete. Agent authenticated:', agent.session !== null);

      // Use the parent post URI
      const postUri = getPostUri(KNOWN_POSTS.parents[0]);
      console.log('Attempting to load thread with URI:', postUri);
      
      // Simulate PostCard URL encoding - remove at:// prefix first
      const normalizedUri = postUri.replace('at://', '');
      const encodedUri = encodeURIComponent(normalizedUri);
      
      // Simulate ThreadPage URL decoding
      const decodedUri = decodeURIComponent(encodedUri);
      
      // Try loading with the decoded URI
      const thread = await loadThread(agent, decodedUri);
      
      expect(thread.rootPost.uri).toBe(postUri);
      expect(thread.rootPost.record).toBeDefined();
      expect((thread.rootPost.record as PostRecord).text).toContain(`#${TEST_TAG}`);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, { timeout: 60000 });

  it('should load threads with deep reply chains', async () => {
    try {
      console.log('Setting up agent for test...');
      const agent = await setupTestAgent();
      console.log('Agent setup complete. Agent authenticated:', agent.session !== null);

      // Use the parent post and its first child
      const rootPostUri = getPostUri(KNOWN_POSTS.parents[0]);
      console.log('Attempting to load thread with URI:', rootPostUri);
      const firstChild = KNOWN_POSTS.children[0];
      const firstChildUri = getPostUri(firstChild.id);
      
      // Load the thread starting from the root
      const thread = await loadThread(agent, rootPostUri.replace('at://', ''));
      
      // Verify thread structure
      expect(thread.rootPost.uri).toBe(rootPostUri);
      expect(thread.replies).toBeDefined();
      expect(thread.replies.some(reply => reply.uri === firstChildUri)).toBe(true);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, { timeout: 60000 });

  it('should handle malformed URIs gracefully', async () => {
    try {
      console.log('Setting up agent for test...');
      const agent = await setupTestAgent();
      console.log('Agent setup complete. Agent authenticated:', agent.session !== null);

      const badUris = [
        'not-a-uri',
        'at://malformed',
        'at://did:plc:fake/wrong/format',
        'did:plc:fake/no-prefix'
      ];

      for (const uri of badUris) {
        console.log('Attempting to load thread with URI:', uri);
        await expect(loadThread(agent, uri)).rejects.toThrow('Invalid thread URI');
      }
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, { timeout: 60000 });
});
