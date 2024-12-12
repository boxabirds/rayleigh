import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useParentPosts, POSTS_PER_PAGE } from '../useParentPosts';
import { useAgent } from '../../contexts/agent';
import { getParentPosts, Community } from '../../utils/communityUtils';

// Mock useAgent hook
vi.mock('../../contexts/agent', () => ({
  useAgent: vi.fn()
}));

// Mock getParentPosts utility
vi.mock('../../utils/communityUtils', () => ({
  getParentPosts: vi.fn()
}));

describe('useParentPosts', () => {
  const mockAgent = {
    session: {
      did: 'test-did'
    }
  };

  const mockCommunity: Community = {
    uri: 'test-uri',
    cid: 'test-cid',
    name: 'Test Community',
    description: 'A test community',
    tag: 'test',
    createdAt: new Date().toISOString(),
    visibility: 'public'
  };

  const createMockPost = (id: string, authorDid: string) => ({
    post: {
      uri: `post-uri-${id}`,
      author: {
        did: authorDid,
        handle: `user-${authorDid}`,
      },
      record: {
        text: `Post ${id} content`
      }
    },
    latestReplyAt: new Date().toISOString()
  });

  // Create an array of POSTS_PER_PAGE mock posts
  const mockPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => 
    createMockPost(`${i + 1}`, `author-${i + 1}`)
  );

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (useAgent as any).mockReturnValue(mockAgent);
    (getParentPosts as any).mockResolvedValue({
      posts: mockPosts,
      cursor: 'next-cursor'
    });
  });

  it('should fetch posts and members when tag and community are provided', async () => {
    const members = ['author-1', 'author-2'];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members })
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for members to be fetched
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/community/test/members', {
        headers: { 'x-did': 'test-did' }
      });
    });

    // Reset getParentPosts mock to ensure we capture the call after members are set
    vi.mocked(getParentPosts).mockClear();

    // Trigger initial load
    await result.current.refresh();
    await waitFor(() => !result.current.isLoading);

    // Verify getParentPosts was called with correct member filter
    expect(getParentPosts).toHaveBeenCalledWith(
      mockAgent,
      'test',
      undefined,
      POSTS_PER_PAGE,
      'recent',
      new Set(members),
      false
    );
  });

  it('should filter posts by members when community is present', async () => {
    // Setup members
    const members = ['author-1', 'author-3'];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members })
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Wait for members to be fetched
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/community/test/members', {
        headers: { 'x-did': 'test-did' }
      });
    });

    // Reset getParentPosts mock to ensure we capture the call after members are set
    vi.mocked(getParentPosts).mockClear();

    // Create posts with mixed authors
    const mixedPosts = [
      createMockPost('1', 'author-1'),  // Member
      createMockPost('2', 'author-2'),  // Non-member
      createMockPost('3', 'author-3'),  // Member
      createMockPost('4', 'author-4'),  // Non-member
    ];

    (getParentPosts as any).mockResolvedValueOnce({
      posts: mixedPosts,
      cursor: 'next-cursor'
    });

    await result.current.refresh();
    await waitFor(() => !result.current.isLoading);

    // Verify getParentPosts was called with correct member filter
    expect(getParentPosts).toHaveBeenCalledWith(
      mockAgent,
      'test',
      undefined,
      POSTS_PER_PAGE,
      'recent',
      new Set(members),
      false
    );
  });

  it('should handle load more', async () => {
    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Load initial posts
    await result.current.refresh();
    await waitFor(() => !result.current.isLoading);

    // Mock next page of posts
    const nextPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => 
      createMockPost(`${i + POSTS_PER_PAGE + 1}`, `author-${i + POSTS_PER_PAGE + 1}`)
    );
    (getParentPosts as any).mockResolvedValueOnce({
      posts: nextPosts,
      cursor: 'final-cursor'
    });

    // Load more posts
    await result.current.loadMore();
    await waitFor(() => !result.current.isLoading);

    expect(result.current.posts).toEqual([...mockPosts, ...nextPosts]);
  });

  it('should handle errors when fetching posts', async () => {
    (getParentPosts as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await result.current.refresh();
    await waitFor(() => !result.current.isLoading);

    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.hasMore).toBe(false);
  });

  it('should handle errors when fetching members', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching members:',
        expect.any(Error)
      );
    });
  });

  it('should not fetch if tag is empty', async () => {
    const { result } = renderHook(() => useParentPosts('', mockCommunity));

    await result.current.refresh();
    expect(getParentPosts).not.toHaveBeenCalled();
  });
});