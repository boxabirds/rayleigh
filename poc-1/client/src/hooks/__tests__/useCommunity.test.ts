import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCommunity } from '../useCommunity';

describe('useCommunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch community data when tag is provided', async () => {
    const mockCommunity = { id: '1', name: 'Test Community' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommunity,
    });

    const { result } = renderHook(() => useCommunity('test'));

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.community).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => !result.current.isLoading);

    // After fetch
    expect(result.current.isLoading).toBe(false);
    expect(result.current.community).toEqual(mockCommunity);
    expect(result.current.error).toBe(null);
    expect(fetch).toHaveBeenCalledWith('/api/communities/test');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCommunity('test'));

    await waitFor(() => !result.current.isLoading);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.community).toBe(null);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle non-ok responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useCommunity('test'));

    await waitFor(() => !result.current.isLoading);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.community).toBe(null);
    expect(result.current.error).toBe('Failed to fetch community');
  });

  it('should not fetch if tag is empty', () => {
    const { result } = renderHook(() => useCommunity(''));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.community).toBe(null);
    expect(result.current.error).toBe(null);
    expect(fetch).not.toHaveBeenCalled();
  });
});