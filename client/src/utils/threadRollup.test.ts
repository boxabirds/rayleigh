import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { rollupThreads } from './threadRollup';

describe('threadRollup', () => {
  const TEST_TAG = 'test';
  const createPost = (uri: string, indexedAt: string, parentUri?: string, rootUri?: string): PostView => ({
    uri,
    cid: 'test-cid',
    author: { did: 'test-did', handle: 'test' },
    record: { text: `test post #${TEST_TAG}`, $type: 'app.bsky.feed.post' },
    indexedAt,
    reply: parentUri ? {
      root: { uri: rootUri || parentUri, cid: 'test-cid' },
      parent: { uri: parentUri, cid: 'test-cid' }
    } : undefined
  });

  it('handles single fresh post', () => {
    const post = createPost('post1', '2024-01-01T00:00:00Z');
    const result = rollupThreads([post], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].rootPost.uri).toBe('post1');
    expect(result.threads[0].children).toHaveLength(0);
    expect(result.threads[0].latestUpdate).toBe('2024-01-01T00:00:00Z');
  });

  it('handles single old post with fresh child', () => {
    const oldPost = createPost('post1', '2024-01-01T00:00:00Z');
    const freshChild = createPost('post2', '2024-01-02T00:00:00Z', 'post1', 'post1');
    const result = rollupThreads([oldPost, freshChild], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].rootPost.uri).toBe('post1');
    expect(result.threads[0].children).toHaveLength(1);
    expect(result.threads[0].children[0].uri).toBe('post2');
    expect(result.threads[0].latestUpdate).toBe('2024-01-02T00:00:00Z');
  });

  it('handles single post with multiple fresh children without duplication', () => {
    const rootPost = createPost('post1', '2024-01-01T00:00:00Z');
    const child1 = createPost('post2', '2024-01-02T00:00:00Z', 'post1', 'post1');
    const child2 = createPost('post3', '2024-01-03T00:00:00Z', 'post1', 'post1');
    
    const result = rollupThreads([rootPost, child1, child2], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].rootPost.uri).toBe('post1');
    expect(result.threads[0].children).toHaveLength(2);
    expect(result.threads[0].latestUpdate).toBe('2024-01-03T00:00:00Z');
  });

  it('sorts multiple root posts by freshness of latest update', () => {
    const oldPost = createPost('post1', '2024-01-01T00:00:00Z');
    const freshPost = createPost('post2', '2024-01-02T00:00:00Z');
    
    const result = rollupThreads([oldPost, freshPost], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(2);
    expect(result.threads[0].rootPost.uri).toBe('post2');
    expect(result.threads[1].rootPost.uri).toBe('post1');
  });

  it('merges new posts into existing threads', () => {
    // First batch
    const rootPost = createPost('post1', '2024-01-01T00:00:00Z');
    const child1 = createPost('post2', '2024-01-02T00:00:00Z', 'post1', 'post1');
    const firstResult = rollupThreads([rootPost, child1], [], TEST_TAG);

    // Second batch with a new child for the existing thread
    const child2 = createPost('post3', '2024-01-03T00:00:00Z', 'post1', 'post1');
    const newRoot = createPost('post4', '2024-01-01T12:00:00Z');
    const result = rollupThreads([child2, newRoot], firstResult.threads, TEST_TAG);

    expect(result.threads).toHaveLength(2);
    // First thread should be post1's thread because it has the newest update
    expect(result.threads[0].rootPost.uri).toBe('post1');
    expect(result.threads[0].children).toHaveLength(2);
    expect(result.threads[0].latestUpdate).toBe('2024-01-03T00:00:00Z');
    // Second thread should be the new root post
    expect(result.threads[1].rootPost.uri).toBe('post4');
  });

  it('handles malformed reply objects', () => {
    const post = createPost('post1', '2024-01-01T00:00:00Z');
    post.reply = {} as any; // Malformed reply
    
    const result = rollupThreads([post], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].rootPost.uri).toBe('post1');
    expect(result.threads[0].children).toHaveLength(0);
  });

  it('filters out posts without the community tag', () => {
    const postWithTag = createPost('post1', '2024-01-01T00:00:00Z');
    const postWithoutTag = {
      ...createPost('post2', '2024-01-02T00:00:00Z'),
      record: { text: 'test post without tag', $type: 'app.bsky.feed.post' }
    };
    
    const result = rollupThreads([postWithTag, postWithoutTag], [], TEST_TAG);
    
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].rootPost.uri).toBe('post1');
  });
});
