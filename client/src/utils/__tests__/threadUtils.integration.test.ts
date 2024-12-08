import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { loadThread } from '../threadUtils';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

describe('threadUtils integration', () => {
  let agent: BskyAgent;
  let testPostUri: string;
  let testPostCid: string;

  beforeAll(async () => {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    const identifier = process.env.BSKY_IDENTIFIER;
    const password = process.env.BSKY_APP_PASSWORD;

    if (!identifier || !password) {
      throw new Error('BSKY_IDENTIFIER and BSKY_APP_PASSWORD environment variables must be set');
    }

    await agent.login({ identifier, password });
  });

  it('should handle full at:// URI format', async () => {
    // First create a test post
    const createPostResponse = await agent.post({
      text: `Test post for URI handling ${Date.now()}`,
    });

    testPostUri = createPostResponse.uri;
    testPostCid = createPostResponse.cid;

    // Test with full at:// format
    const thread = await loadThread(agent, testPostUri.replace('at://', ''));
    
    expect(thread.rootPost.uri).toBe(testPostUri);
    expect(thread.rootPost.cid).toBe(testPostCid);
    expect(thread.rootPost.record).toBeDefined();
    expect((thread.rootPost.record as PostRecord).text).toBeDefined();

    // Clean up
    await agent.deletePost(testPostUri);
  }, 15000);

  it('should handle encoded URIs from PostCard clicks', async () => {
    // Create a test post
    const createPostResponse = await agent.post({
      text: `Test post for encoded URIs ${Date.now()}`,
    });

    const postUri = createPostResponse.uri;
    
    // Simulate PostCard URL encoding - remove at:// prefix first
    const normalizedUri = postUri.replace('at://', '');
    const encodedUri = encodeURIComponent(normalizedUri);
    console.log('Encoded URI:', encodedUri);
    
    // Simulate ThreadPage URL decoding
    const decodedUri = decodeURIComponent(encodedUri);
    console.log('Decoded URI:', decodedUri);
    
    // Try loading with the decoded URI
    const thread = await loadThread(agent, decodedUri);
    
    expect(thread.rootPost.uri).toBe(postUri);
    expect(thread.rootPost.record).toBeDefined();
    expect((thread.rootPost.record as PostRecord).text).toBeDefined();
    
    // Clean up
    await agent.deletePost(postUri);
  }, 15000);

  it('should load threads with deep reply chains', async () => {
    // Create root post
    const rootPostResponse = await agent.post({
      text: `Root post for testing replies ${Date.now()}`,
    });
    
    // Wait a bit before creating replies to ensure proper ordering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create first reply
    const reply1Response = await agent.post({
      text: 'Reply 1',
      reply: {
        root: {
          uri: rootPostResponse.uri,
          cid: rootPostResponse.cid,
        },
        parent: {
          uri: rootPostResponse.uri,
          cid: rootPostResponse.cid,
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create second reply (reply to reply1)
    const reply2Response = await agent.post({
      text: 'Reply 2',
      reply: {
        root: {
          uri: rootPostResponse.uri,
          cid: rootPostResponse.cid,
        },
        parent: {
          uri: reply1Response.uri,
          cid: reply1Response.cid,
        }
      }
    });
    
    // Wait for replies to be indexed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test loading the thread
    const thread = await loadThread(agent, rootPostResponse.uri.replace('at://', ''));
    
    // Verify thread structure
    expect(thread.rootPost.uri).toBe(rootPostResponse.uri);
    expect(thread.replies).toHaveLength(2);
    
    // Verify replies are in the correct order
    const replyUris = thread.replies.map(reply => reply.uri);
    expect(replyUris).toContain(reply1Response.uri);
    expect(replyUris).toContain(reply2Response.uri);
    
    // Clean up
    await agent.deletePost(reply2Response.uri);
    await agent.deletePost(reply1Response.uri);
    await agent.deletePost(rootPostResponse.uri);
  }, 20000);

  it('should handle malformed URIs gracefully', async () => {
    const badUris = [
      'not-a-uri',
      'at://malformed',
      'at://did:plc:fake/wrong/format',
      'did:plc:fake/no-prefix'
    ];

    for (const uri of badUris) {
      try {
        await loadThread(agent, uri);
        fail('Should have thrown an error for malformed URI');
      } catch (error) {
        expect(error).toBeDefined();
      }
    }
  });
});
