import { renderHook, waitFor, act } from '@testing-library/react';
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

  // Create next page of posts
  const nextPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => 
    createMockPost(`${i + POSTS_PER_PAGE + 1}`, `author-${i + POSTS_PER_PAGE + 1}`)
  );

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (useAgent as any).mockReturnValue(mockAgent);
  });

  it('should fetch posts and members when tag and community are provided', async () => {
    (getParentPosts as any).mockResolvedValue({
      posts: mockPosts,
      cursor: 'next-cursor'
    });

    const members = ['author-1', 'author-2'];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members })
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Initial load with empty members set
    expect(getParentPosts).toHaveBeenCalledWith(
      mockAgent,
      'test',
      undefined,
      POSTS_PER_PAGE,
      'recent',
      new Set(),
      false
    );

    // Wait for members to be fetched
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/community/test/members', {
        headers: { 'x-did': 'test-did' }
      });
    });

    // Second load with members
    await waitFor(() => {
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

    // Check final state
    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.error).toBe(null);
  });

  it('should filter posts by members when community is present', async () => {
    // Setup members
    const members = ['author-1', 'author-3'];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members })
    });

    // Create posts with mixed authors
    const mixedPosts = [
      createMockPost('1', 'author-1'),  // Member
      createMockPost('2', 'author-2'),  // Non-member
      createMockPost('3', 'author-3'),  // Member
      createMockPost('4', 'author-4'),  // Non-member
    ];

    // Mock the initial call with all posts
    (getParentPosts as any).mockResolvedValueOnce({
      posts: mixedPosts,
      cursor: 'next-cursor'
    });

    // Mock the second call with filtered posts
    const filteredPosts = mixedPosts.filter(post => members.includes(post.post.author.did));
    (getParentPosts as any).mockResolvedValueOnce({
      posts: filteredPosts,
      cursor: 'next-cursor'
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Initial load with empty members set
    expect(getParentPosts).toHaveBeenCalledWith(
      mockAgent,
      'test',
      undefined,
      POSTS_PER_PAGE,
      'recent',
      new Set(),
      false
    );

    // Wait for members to be fetched and second getParentPosts call
    await waitFor(() => {
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

    // Wait for loading to complete
    await waitFor(() => !result.current.isLoading);

    // Compare posts ignoring timestamps
    const stripTimestamps = (posts: any[]) => 
      posts.map(({ latestReplyAt, ...rest }) => rest);

    // Check filtered posts
    expect(stripTimestamps(result.current.posts))
      .toEqual(stripTimestamps(filteredPosts));
  });

  it('should handle load more', async () => {
    // Mock window.location.search
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, search: '' };

    // Create initial posts (1-10, older posts)
    const initialPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => 
      createMockPost(`${i + 1}`, `author-${i + 1}`)
    );

    // Create next page posts (11-20, newer posts)
    const nextPagePosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => 
      createMockPost(`${i + 11}`, `author-${i + 11}`)
    );

    // Mock getParentPosts responses
    (getParentPosts as any)
      .mockResolvedValueOnce({
        posts: initialPosts,  // First page: older posts (1-10)
        cursor: 'next-cursor'
      })
      .mockResolvedValueOnce({
        posts: nextPagePosts,  // Second page: newer posts (11-20)
        cursor: undefined
      });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Wait for initial load
    await waitFor(() => !result.current.isLoading);
    expect(result.current.posts).toHaveLength(POSTS_PER_PAGE);

    // Load more
    await act(async () => {
      await result.current.loadMore();
    });

    // Wait for loading to complete
    await waitFor(() => !result.current.isLoading);

    // Compare posts ignoring timestamps
    const stripTimestamps = (posts: any[]) => 
      posts.map(({ latestReplyAt, ...rest }) => rest);

    // Posts should be in order: older posts (1-10) followed by newer posts (11-20)
    expect(stripTimestamps(result.current.posts))
      .toEqual(stripTimestamps([...initialPosts, ...nextPagePosts]));

    // Restore window.location
    window.location = originalLocation;
  });

  it('should handle empty posts response', async () => {
    (getParentPosts as any).mockResolvedValue({
      posts: [],
      cursor: undefined
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(0);
      expect(result.current.hasMore).toBe(false);
    });
  });

  it('should handle error when fetching posts', async () => {
    const error = new Error('Failed to fetch posts');
    (getParentPosts as any).mockRejectedValue(error);

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(result.current.error).toBe(error.message);
      expect(result.current.hasMore).toBe(false);
    });
  });

  it('should handle error when fetching members', async () => {
    // Mock fetch to reject
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch members'));

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(0);
    });
  });

  it('should not fetch if tag is empty', async () => {
    const { result } = renderHook(() => useParentPosts('', mockCommunity));

    await waitFor(() => !result.current.isLoading);

    expect(getParentPosts).not.toHaveBeenCalled();
  });

  it('should not show hasMore when posts are empty', async () => {
    (getParentPosts as any).mockResolvedValue({
      posts: [],
      cursor: undefined
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should automatically load posts on mount', async () => {
    // Set up mock before rendering
    (getParentPosts as any).mockResolvedValue({
      posts: mockPosts,
      cursor: 'next-cursor'
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    await waitFor(() => {
      expect(getParentPosts).toHaveBeenCalled();
      expect(result.current.posts).toEqual(mockPosts);
    });
  });

  it('should reload posts when members are loaded', async () => {
    // Setup delayed member response
    const members = ['author-1', 'author-3'];
    let resolveMembersFetch: (value: any) => void;
    const membersFetchPromise = new Promise(resolve => {
      resolveMembersFetch = resolve;
    });
    (global.fetch as any).mockImplementationOnce(() => membersFetchPromise);

    // First load will use empty member set
    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Wait for initial load with empty member set
    await waitFor(() => {
      expect(getParentPosts).toHaveBeenCalledWith(
        mockAgent,
        'test',
        undefined,
        POSTS_PER_PAGE,
        'recent',
        new Set(),  // Empty member set
        false
      );
    });

    // Reset mock to track next call
    vi.mocked(getParentPosts).mockClear();

    // Resolve members fetch
    resolveMembersFetch({
      ok: true,
      json: async () => ({ members })
    });

    // Wait for reload with member set
    await waitFor(() => {
      expect(getParentPosts).toHaveBeenCalledWith(
        mockAgent,
        'test',
        undefined,
        POSTS_PER_PAGE,
        'recent',
        new Set(members),  // Now with members
        false
      );
    });
  });
});