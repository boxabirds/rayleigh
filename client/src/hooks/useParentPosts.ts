import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '../contexts/agent';
import { 
  Community, 
  CommunityPost, 
  getParentPosts 
} from '../utils/communityUtils';

interface UseParentPostsResult {
  posts: CommunityPost[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const POSTS_PER_PAGE = 10;

export function useParentPosts(
  tag: string, 
  community: Community | null
): UseParentPostsResult {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agent = useAgent();

  // Load members when community changes
  useEffect(() => {
    async function fetchMembers() {
      if (!tag || !agent?.session?.did || !community) return;
      try {
        const cleanTag = tag.replace(/^#/, '');
        const response = await fetch(`/api/community/${cleanTag}/members`, {
          headers: { 'x-did': agent.session.did }
        });
        if (response.ok) {
          const { members: membersList } = await response.json();
          setMembers(new Set(membersList));
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setMembers(new Set());
      }
    }
    fetchMembers();
  }, [tag, agent?.session?.did, community]);

  const loadPosts = useCallback(async (isInitialLoad = false) => {
    if (!agent || isLoading || !tag) return;
    if (!isInitialLoad && !cursor) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const includeAll = params.get('scope') === 'all';
      const memberFilter = community ? members : undefined;

      const result = await getParentPosts(
        agent,
        tag,
        isInitialLoad ? undefined : cursor,
        POSTS_PER_PAGE,
        'recent',
        memberFilter,
        includeAll
      );
      setPosts(prev => isInitialLoad ? result.posts : [...prev, ...result.posts]);
      setCursor(result.cursor);
      setHasMore(result.posts.length === POSTS_PER_PAGE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent, tag, cursor, members, community]);

  return {
    posts,
    isLoading,
    hasMore,
    error,
    loadMore: () => loadPosts(false),
    refresh: () => loadPosts(true)
  };
}