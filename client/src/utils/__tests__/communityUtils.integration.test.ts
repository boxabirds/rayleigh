import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { getParentPosts } from '../communityUtils';
import { setupTestAgent } from './testSetup';
import { TEST_TAG, KNOWN_POSTS, getAllPostIds } from './fixtures/integrationTestData';

describe('communityUtils integration', () => {
  let agent: BskyAgent;

  beforeAll(async () => {
    console.log('communityUtils.integration.test.ts - beforeAll start:', new Date().toISOString());
    agent = await setupTestAgent();
    console.log('communityUtils.integration.test.ts - beforeAll end:', new Date().toISOString());
  });

  it('should return single parent from special production tag', async () => {
    console.log('communityUtils.integration.test.ts - test start:', new Date().toISOString());
    // 1. Search for #rayleighintegrationtest1
    const searchResponse = await agent.api.app.bsky.feed.searchPosts({
      q: `#${TEST_TAG}`,
      limit: 100,
    });

    console.log('Found posts:', searchResponse.data.posts.map(post => ({
      uri: post.uri,
      text: (post.record as any).text,
      isReply: !!post.reply
    })));

    // 2. Compare search results against known post IDs
    const expectedPostIds = new Set([
      KNOWN_POSTS.parent,
      ...KNOWN_POSTS.children.flatMap(child => getAllPostIds(child))
    ]);

    const foundPostIds = new Set(
      searchResponse.data.posts.map(post => post.uri.split('/').pop())
    );

    // Check if we found all expected posts
    const missingPosts = [...expectedPostIds].filter(id => !foundPostIds.has(id));
    if (missingPosts.length > 0) {
      throw new Error(`Missing expected posts: ${missingPosts.join(', ')}`);
    }

    // Check if we found any unexpected posts
    const unexpectedPosts = [...foundPostIds].filter(id => !expectedPostIds.has(id));
    if (unexpectedPosts.length > 0) {
      throw new Error(`Found unexpected posts: ${unexpectedPosts.join(', ')}`);
    }

    // 4. Pass posts to getParentPosts
    const result = await getParentPosts(agent, TEST_TAG);

    console.log('getParentPosts result:', result.posts.map(p => ({
      uri: p.post.uri,
      text: (p.post.record as any).text,
      isReply: !!p.post.reply
    })));

    // 5. Confirm single parent post
    expect(result.posts.length).toBe(1);
    expect(result.posts[0].post.uri).toBe(
      `at://did:plc:lasy2wsk6shhobbfm5ujhisn/app.bsky.feed.post/${KNOWN_POSTS.parent}`
    );
  });
});
