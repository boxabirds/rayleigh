import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';
import { getParentPosts } from '../communityUtils';

// Test data: Known post hierarchy for #rayleighintegrationtest1
const TEST_TAG = 'rayleighintegrationtest1';
const KNOWN_POSTS = {
  parent: '3lcvgo7r7w22p',
  children: [
    {
      id: '3lcvgow535c2p',
      children: [
        {
          id: '3lcvgpofbz22p',
          children: [{ id: '3lcvgpy5zt22p', children: [] }]
        },
        { id: '3lcvgsyosnc2w', children: [] }
      ]
    },
    {
      id: '3lcvgpa2cj22p',
      children: [{ id: '3lcvgqb72ts2p', children: [] }]
    },
    { id: '3lcvgqitl2s2p', children: [] }
  ]
};

// Flatten the hierarchy to get all post IDs for validation
function getAllPostIds(node: { id: string, children: any[] }): string[] {
  const ids = [node.id];
  for (const child of node.children) {
    ids.push(...getAllPostIds(child));
  }
  return ids;
}

describe('communityUtils integration', () => {
  let agent: BskyAgent;

  beforeAll(async () => {
    agent = new BskyAgent({ service: 'https://bsky.social' });
    const identifier = process.env.BSKY_IDENTIFIER;
    const password = process.env.BSKY_APP_PASSWORD;

    if (!identifier || !password) {
      throw new Error('BSKY_IDENTIFIER and BSKY_APP_PASSWORD environment variables must be set');
    }

    await agent.login({ identifier, password });

    // Verify that the parent post exists
    try {
      const parentUri = `at://did:plc:lasy2wsk6shhobbfm5ujhisn/app.bsky.feed.post/${KNOWN_POSTS.parent}`;
      const parentPost = await agent.getPostThread({ uri: parentUri });
      if (!parentPost.data.thread.post.record.text.includes(`#${TEST_TAG}`)) {
        throw new Error('Parent post does not contain the expected tag');
      }
    } catch (error) {
      throw new Error(`Required test data not found: Parent post ${KNOWN_POSTS.parent} must exist with tag #${TEST_TAG}`);
    }
  });

  it('should return single parent from special production tag', async () => {
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
