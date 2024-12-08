import { describe, it, expect, vi } from 'vitest';
import { parseAtUri, ThreadLoadError, loadThread } from '../threadUtils';
import { BskyAgent } from '@atproto/api';

vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn().mockImplementation(() => ({
    api: {
      app: {
        bsky: {
          feed: {
            getPostThread: vi.fn(),
          },
        },
      },
    },
  })),
}));

describe('threadUtils', () => {
  describe('parseAtUri', () => {
    it('should parse valid URI', () => {
      const uri = 'did:plc:1234/app.bsky.feed.post/5678';
      const result = parseAtUri(uri);
      expect(result).toEqual({
        did: 'did:plc:1234',
        collection: 'app.bsky.feed.post',
        rkey: '5678',
      });
    });

    it('should throw error for invalid URI format', () => {
      const invalidUris = [
        'invalid-uri',
        'did:plc:1234/invalid',
        'did:plc:1234/app.bsky.feed.post',
        '',
      ];

      invalidUris.forEach(uri => {
        expect(() => parseAtUri(uri)).toThrow();
      });
    });
  });

  describe('loadThread', () => {
    let mockAgent: jest.Mocked<BskyAgent>;

    beforeEach(() => {
      mockAgent = new BskyAgent() as jest.Mocked<BskyAgent>;
    });

    it('should load thread successfully', async () => {
      const mockThread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'did:plc:abc/app.bsky.feed.post/123',
              cid: 'cid',
              author: { did: 'did:plc:abc', handle: 'test.bsky.social' },
              record: { text: 'test', createdAt: new Date().toISOString() },
              indexedAt: new Date().toISOString(),
            },
            replies: [],
          },
        },
      };

      mockAgent.api.app.bsky.feed.getPostThread.mockResolvedValue(mockThread);

      const result = await loadThread(mockAgent, 'did:plc:abc/app.bsky.feed.post/123');
      expect(result.rootPost).toBeDefined();
      expect(result.replies).toBeDefined();
      expect(mockAgent.api.app.bsky.feed.getPostThread).toHaveBeenCalledWith({
        uri: 'at://did:plc:abc/app.bsky.feed.post/123',
        depth: 100,
        parentHeight: 0,
      });
    });

    it('should handle API errors', async () => {
      mockAgent.api.app.bsky.feed.getPostThread.mockRejectedValue(new Error('API Error'));
      await expect(loadThread(mockAgent, 'did:plc:abc/app.bsky.feed.post/123')).rejects.toThrow();
    });
  });
});
