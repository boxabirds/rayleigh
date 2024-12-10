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
  });
});
