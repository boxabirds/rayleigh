import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getParentPosts } from '../communityUtils';
import { BskyAgent } from '@atproto/api';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

describe('communityUtils', () => {
  describe('getParentPosts', () => {
    const mockAgent = {
      api: {
        app: {
          bsky: {
            feed: {
              searchPosts: vi.fn()
            }
          }
        }
      }
    } as unknown as BskyAgent;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return only parent posts with the community tag', async () => {
      const mockPosts: PostView[] = [
        {
          uri: 'post1',
          cid: 'cid1',
          record: { text: 'Parent post #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-01T00:00:00Z',
          author: {
            did: 'did:plc:test-author',
            handle: 'test.author',
            displayName: 'Test Author',
          },
        } as PostView,
        {
          uri: 'post2',
          cid: 'cid2',
          record: { 
            text: 'Reply post #test', 
            $type: 'app.bsky.feed.post',
            reply: {
              root: { uri: 'post1', cid: 'cid1' },
              parent: { uri: 'post1', cid: 'cid1' }
            }
          },
          reply: {
            root: { uri: 'post1', cid: 'cid1' },
            parent: { uri: 'post1', cid: 'cid1' }
          },
          indexedAt: '2023-01-02T00:00:00Z',
          author: {
            did: 'did:plc:test-author-2',
            handle: 'test.author2',
            displayName: 'Test Author 2',
          },
        } as PostView,
        {
          uri: 'post3',
          cid: 'cid3',
          record: { text: 'Another parent without tag', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-03T00:00:00Z',
          author: {
            did: 'did:plc:test-author-3',
            handle: 'test.author3',
            displayName: 'Test Author 3',
          },
        } as PostView
      ];

      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          posts: mockPosts
        }
      });

      const result = await getParentPosts(mockAgent, 'test');

      console.log('Posts returned:', result.posts.map(p => ({
        uri: p.post.uri,
        text: (p.post.record as any).text,
        hasReply: !!p.post.reply
      })));

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].post.uri).toBe('post1');
      expect(result.posts[0].latestReplyAt).toBe('2023-01-02T00:00:00Z'); // Updated by reply
    });

    it('should sort posts by most recent activity', async () => {
      const mockPosts: PostView[] = [
        {
          uri: 'post1',
          cid: 'cid1',
          record: { text: 'Old post #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-01T00:00:00Z',
          author: {
            did: 'did:plc:test-author',
            handle: 'test.author',
            displayName: 'Test Author',
          },
        } as PostView,
        {
          uri: 'post2',
          cid: 'cid2',
          record: { text: 'New post #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-03T00:00:00Z',
          author: {
            did: 'did:plc:test-author-2',
            handle: 'test.author2',
            displayName: 'Test Author 2',
          },
        } as PostView,
        {
          uri: 'post3',
          cid: 'cid3',
          record: { 
            text: 'Reply to old', 
            $type: 'app.bsky.feed.post',
            reply: {
              root: { uri: 'post1', cid: 'cid1' },
              parent: { uri: 'post1', cid: 'cid1' }
            }
          },
          reply: {
            root: { uri: 'post1', cid: 'cid1' },
            parent: { uri: 'post1', cid: 'cid1' }
          },
          indexedAt: '2023-01-02T00:00:00Z',
          author: {
            did: 'did:plc:test-author-3',
            handle: 'test.author3',
            displayName: 'Test Author 3',
          },
        } as PostView
      ];

      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          posts: mockPosts
        }
      });

      const result = await getParentPosts(mockAgent, 'test');

      console.log('Posts returned:', result.posts.map(p => ({
        uri: p.post.uri,
        text: (p.post.record as any).text,
        hasReply: !!p.post.reply
      })));

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].post.uri).toBe('post2'); // Most recent post
      expect(result.posts[1].post.uri).toBe('post1'); // Older post with reply
    });

    it('should respect maxPosts limit', async () => {
      const mockPosts: PostView[] = Array.from({ length: 30 }, (_, i) => ({
        uri: `post${i}`,
        cid: `cid${i}`,
        record: { text: `Post ${i} #test`, $type: 'app.bsky.feed.post' },
        indexedAt: `2023-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        author: {
          did: `did:plc:test-author-${i}`,
          handle: `test.author${i}`,
          displayName: `Test Author ${i}`,
        },
      } as PostView));

      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          posts: mockPosts
        }
      });

      const result = await getParentPosts(mockAgent, 'test', undefined, 10);

      console.log('Posts returned:', result.posts.map(p => ({
        uri: p.post.uri,
        text: (p.post.record as any).text,
        hasReply: !!p.post.reply
      })));

      expect(result.posts).toHaveLength(10);
    });

    it('should sort posts by like count when sortOrder is "top"', async () => {
      const mockPosts: PostView[] = [
        {
          uri: 'post1',
          cid: 'cid1',
          record: { text: 'Most liked post #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-01T00:00:00Z',
          likeCount: 100,
          author: {
            did: 'did:plc:test-author',
            handle: 'test.author',
            displayName: 'Test Author',
          },
        } as PostView,
        {
          uri: 'post2',
          cid: 'cid2',
          record: { text: 'Newer but less liked post #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-03T00:00:00Z',
          likeCount: 50,
          author: {
            did: 'did:plc:test-author-2',
            handle: 'test.author2',
            displayName: 'Test Author 2',
          },
        } as PostView,
        {
          uri: 'post3',
          cid: 'cid3',
          record: { text: 'Equal likes but newer #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-04T00:00:00Z',
          likeCount: 100,
          author: {
            did: 'did:plc:test-author-3',
            handle: 'test.author3',
            displayName: 'Test Author 3',
          },
        } as PostView
      ];

      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          posts: mockPosts
        }
      });

      // Test top sort order
      const topResult = await getParentPosts(mockAgent, 'test', undefined, 10, 'top');
      expect(topResult.posts).toHaveLength(3);
      expect(topResult.posts[0].post.uri).toBe('post3'); // Equal likes but newer
      expect(topResult.posts[1].post.uri).toBe('post1'); // Equal likes but older
      expect(topResult.posts[2].post.uri).toBe('post2'); // Less likes

      // Test recent sort order (default)
      const recentResult = await getParentPosts(mockAgent, 'test');
      expect(recentResult.posts).toHaveLength(3);
      expect(recentResult.posts[0].post.uri).toBe('post3'); // Most recent
      expect(recentResult.posts[1].post.uri).toBe('post2'); // Second most recent
      expect(recentResult.posts[2].post.uri).toBe('post1'); // Oldest
    });

    it('should handle posts with undefined like counts when sorting by top', async () => {
      const mockPosts: PostView[] = [
        {
          uri: 'post1',
          cid: 'cid1',
          record: { text: 'Post with likes #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-01T00:00:00Z',
          likeCount: 10,
          author: {
            did: 'did:plc:test-author',
            handle: 'test.author',
            displayName: 'Test Author',
          },
        } as PostView,
        {
          uri: 'post2',
          cid: 'cid2',
          record: { text: 'Post without likes #test', $type: 'app.bsky.feed.post' },
          indexedAt: '2023-01-02T00:00:00Z',
          author: {
            did: 'did:plc:test-author-2',
            handle: 'test.author2',
            displayName: 'Test Author 2',
          },
        } as PostView,
      ];

      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          posts: mockPosts
        }
      });

      const result = await getParentPosts(mockAgent, 'test', undefined, 10, 'top');
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].post.uri).toBe('post1'); // Has likes
      expect(result.posts[1].post.uri).toBe('post2'); // No likes (undefined)
    });

    it('should fetch until required number of parent posts is found', async () => {
      // Create 100 posts, 1 second apart, post 1 newest, post 100 oldest
      const mockPosts: PostView[] = Array.from({ length: 100 }, (_, i) => {
        const postNumber = i + 1;
        const isParent = postNumber <= 9 || postNumber === 100;
        // post 1 newest (latest timestamp), post 100 oldest (earliest timestamp)
        const timestamp = new Date(2023, 0, 1, 0, 100 - postNumber);  // post 1 at 1:39, post 100 at 0:00

        return {
          uri: `at://fake.uri/posts/${postNumber}`,
          cid: `cid${postNumber}`,
          record: {
            text: `Post ${postNumber} #test`,
            $type: 'app.bsky.feed.post',
            // Only parent posts (1-9 and 100) don't have reply field
            ...(isParent ? {} : {
              reply: {
                root: { uri: 'at://fake.uri/posts/1', cid: 'cid1' },
                parent: { uri: 'at://fake.uri/posts/1', cid: 'cid1' }
              }
            })
          },
          indexedAt: timestamp.toISOString(),
          likeCount: 10,
          author: {
            did: `did:plc:test${i}`,
            handle: `test${i}.bsky.social`,
            displayName: `Test User ${i}`,
          },
        } as PostView;
      });

      // Mock 5 batches of 20 posts each
      (mockAgent.api.app.bsky.feed.searchPosts as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { posts: mockPosts.slice(0, 20), cursor: 'cursor1' } })
        .mockResolvedValueOnce({ data: { posts: mockPosts.slice(20, 40), cursor: 'cursor2' } })
        .mockResolvedValueOnce({ data: { posts: mockPosts.slice(40, 60), cursor: 'cursor3' } })
        .mockResolvedValueOnce({ data: { posts: mockPosts.slice(60, 80), cursor: 'cursor4' } })
        .mockResolvedValueOnce({ data: { posts: mockPosts.slice(80, 100), cursor: 'cursor5' } });

      const result = await getParentPosts(mockAgent, 'test', undefined, 10);

      // Should have made all 5 calls to get 10 parent posts
      expect(mockAgent.api.app.bsky.feed.searchPosts).toHaveBeenCalledTimes(5);

      // Should have found all 10 parent posts
      expect(result.posts).toHaveLength(10);

      // Verify posts are in correct order (most recent first)
      const postNumbers = result.posts.map(p => parseInt(p.post.uri.split('/').pop()!));
      expect(postNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    });
  });
});
