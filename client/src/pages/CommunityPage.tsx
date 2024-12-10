import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { PostCard } from '../components/PostCard';
import { ThemeToggle } from '../components/theme-toggle';
import { getParentPosts, CommunityPost } from '../utils/communityUtils';
import { useAgent } from "@/contexts/agent";
import { useToast } from "@/hooks/use-toast";

interface CommunityPageProps {
  tag?: string;
}

export default function CommunityPage({ tag }: CommunityPageProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const agent = useAgent();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Check URL parameters for newCommunity flag
    const params = new URLSearchParams(window.location.search);
    if (params.get('newCommunity') === 'true') {
      const communityName = params.get('communityName');
      if (communityName) {
        toast({
          title: "Success!",
          description: `You have successfully created the '${communityName}' community!`,
        });
      }
    }
  }, [toast]);

  const fetchPosts = useCallback(async () => {
    if (!agent || isLoading || !hasMore || !tag) return;
    
    setIsLoading(true);
    try {
      const result = await getParentPosts(agent, tag, cursor);
      setPosts(prev => [...prev, ...result.posts]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent, tag, cursor, isLoading, hasMore]);

  const handlePostClick = useCallback((post: CommunityPost) => {
    const postId = post.post.uri.split('/').pop() || '';
    const threadPath = `${post.post.author.handle}/${postId}`;
    navigate(`/thread/${encodeURIComponent(threadPath)}`);
  }, [navigate]);

  React.useEffect(() => {
    if (!tag || !agent) return;

    // Reset state when tag changes
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    setIsLoading(false);  // Reset loading state
    
    // Fetch first page
    const doFetch = async () => {
      setIsLoading(true);
      try {
        const result = await getParentPosts(agent, tag);
        setPosts(result.posts);
        setCursor(result.cursor);
        setHasMore(!!result.cursor);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts. Please try again.');
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    doFetch();
  }, [tag, agent]);

  if (!tag) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Community</h1>
            <ThemeToggle />
          </div>
          <p className="text-muted-foreground">No tag selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">#{tag}</h1>
          <ThemeToggle />
        </div>

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <div 
              key={post.post.uri}
              onClick={() => handlePostClick(post)}
              className="cursor-pointer transition-colors hover:bg-accent/50 rounded-lg"
            >
              <PostCard post={post.post} />
            </div>
          ))}

          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-accent rounded-lg"></div>
              <div className="h-24 bg-accent rounded-lg"></div>
            </div>
          )}

          {!isLoading && posts.length === 0 && (
            <p className="text-muted-foreground text-center">No posts found for #{tag}</p>
          )}

          {!isLoading && (
            hasMore ? (
              <button
                onClick={() => fetchPosts()}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                aria-label="Load more posts"
              >
                More
              </button>
            ) : posts.length > 0 && (
              <p className="text-center text-muted-foreground italic mt-8">
                No more posts
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
