import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useParentPosts, POSTS_PER_PAGE } from '../useParentPosts';
import { useAgent } from '../../contexts/agent';
import { getParentPosts } from '../../utils/communityUtils';

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

  const mockCommunity = {
    id: '1',
    name: 'Test Community'
  };

  // Create an array of POSTS_PER_PAGE mock posts
  const mockPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => ({
    id: `${i + 1}`,
    content: `Post ${i + 1}`
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
    (useAgent as any).mockReturnValue(mockAgent);
    (getParentPosts as any).mockResolvedValue({
      posts: mockPosts,
      cursor: 'next-cursor'
    });
  });

  it('should fetch posts and members when tag and community are provided', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: ['member1', 'member2'] })
    });

    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);

    // Trigger initial load
    await result.current.refresh();

    await waitFor(() => !result.current.isLoading);

    // After fetch
    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.hasMore).toBe(true); // Now should pass as we have POSTS_PER_PAGE posts
    expect(result.current.error).toBe(null);
    expect(fetch).toHaveBeenCalledWith('/api/community/test/members', {
      headers: { 'x-did': 'test-did' }
    });
  });

  it('should handle load more', async () => {
    const { result } = renderHook(() => 
      useParentPosts('test', mockCommunity)
    );

    // Load initial posts
    await result.current.refresh();
    await waitFor(() => !result.current.isLoading);

    // Mock next page of posts
    const nextPosts = Array.from({ length: POSTS_PER_PAGE }, (_, i) => ({
      id: `${i + POSTS_PER_PAGE + 1}`,
      content: `Post ${i + POSTS_PER_PAGE + 1}`
    }));
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