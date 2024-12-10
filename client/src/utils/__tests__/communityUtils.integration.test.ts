import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { getParentPosts } from '../communityUtils';
import { setupTestAgent } from './testSetup';
import { TEST_TAG, KNOWN_POSTS, getAllPostIds, BASE_URI } from './fixtures/integrationTestData';

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

  it('should sort posts by like count when using top sort order', async () => {
    // First get all posts to verify test data
    const searchResponse = await agent.api.app.bsky.feed.searchPosts({
      q: `#${TEST_TAG}`,
      limit: 100,
    });

    // Get parent post and verify it exists
    const parentPost = searchResponse.data.posts.find(post => 
      post.uri === `${BASE_URI}/${KNOWN_POSTS.parent}`
    );
    expect(parentPost).toBeDefined();

    // Get posts sorted by likes
    const topResult = await getParentPosts(agent, TEST_TAG, undefined, 10, 'top');
    expect(topResult.posts.length).toBe(1); // Should still only find one parent post

    // Get posts sorted by recent (default)
    const recentResult = await getParentPosts(agent, TEST_TAG);
    expect(recentResult.posts.length).toBe(1);

    // Both sorts should return the same post since there's only one parent
    expect(topResult.posts[0].post.uri).toBe(recentResult.posts[0].post.uri);
    expect(topResult.posts[0].post.uri).toBe(`${BASE_URI}/${KNOWN_POSTS.parent}`);

    // Verify post has expected properties
    const topPost = topResult.posts[0].post;
    expect(topPost.likeCount).toBeDefined();
    expect(typeof topPost.likeCount).toBe('number');
    expect(topPost.indexedAt).toBeDefined();
  });

  it('should maintain consistent sorting behavior across multiple calls', async () => {
    // Make multiple calls and verify results are consistent
    const results = await Promise.all([
      getParentPosts(agent, TEST_TAG, undefined, 10, 'top'),
      getParentPosts(agent, TEST_TAG, undefined, 10, 'recent'),
      getParentPosts(agent, TEST_TAG, undefined, 10, 'top')
    ]);

    // All calls should return the same number of posts
    expect(results[0].posts.length).toBe(results[1].posts.length);
    expect(results[1].posts.length).toBe(results[2].posts.length);

    // All calls should return the same parent post
    const uris = results.map(r => r.posts[0].post.uri);
    expect(uris[0]).toBe(uris[1]);
    expect(uris[1]).toBe(uris[2]);
    expect(uris[0]).toBe(`${BASE_URI}/${KNOWN_POSTS.parent}`);
  });
});
