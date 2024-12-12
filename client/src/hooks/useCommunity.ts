import { useState, useEffect } from 'react';
import { Community } from '../utils/communityUtils';

interface UseCommunityResult {
  community: Community | null;
  isLoading: boolean;
  error: string | null;
}

export function useCommunity(tag: string): UseCommunityResult {
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunity() {
      if (!tag) return;
      setIsLoading(true);
      try {
        const cleanTag = tag.replace(/^#/, '');
        const response = await fetch(`/api/communities/${cleanTag}`);
        if (response.ok) {
          const data = await response.json();
          setCommunity(data);
        } else {
          setCommunity(null);
          setError('Failed to fetch community');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch community');
        setCommunity(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCommunity();
  }, [tag]);

  return { community, isLoading, error };
}