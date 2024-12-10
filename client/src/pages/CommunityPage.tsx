import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { PostCard } from '../components/PostCard';
import { ThemeToggle } from '../components/theme-toggle';
import { getParentPosts, CommunityPost, getCommunityByTag, Community } from '../utils/communityUtils';
import { useAgent } from "@/contexts/agent";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface CommunityPageProps {
  tag?: string;
}

export default function CommunityPage({ tag }: CommunityPageProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
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

  useEffect(() => {
    async function fetchCommunity() {
      if (!tag) return;
      
      setIsCommunityLoading(true);
      try {
        const cleanTag = tag.replace(/^#/, '');
        const response = await fetch(`/api/communities/${cleanTag}`);
        
        if (response.ok) {
          const communityData = await response.json();
          setCommunity(communityData);
        } else {
          setCommunity(null);
        }
      } catch (err) {
        console.error('Error fetching community:', err);
        setCommunity(null);
      } finally {
        setIsCommunityLoading(false);
      }
    }

    fetchCommunity();
  }, [tag]);

  const fetchPosts = useCallback(async () => {
    if (!agent || isLoading || !hasMore || !tag) return;
    
    setIsLoading(true);
    try {
      const result = await getParentPosts(agent, tag, cursor);
      setPosts(prev => {
        // Create a Set of existing URIs for O(1) lookup
        const existingUris = new Set(prev.map(p => p.post.uri));
        
        // Filter out any posts that already exist
        const newPosts = result.posts.filter(p => !existingUris.has(p.post.uri));
        
        return [...prev, ...newPosts];
      });
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent, isLoading, hasMore, tag, cursor]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostClick = (post: CommunityPost) => {
    const postId = post.post.uri.split('/').pop();
    const authorHandle = post.post.author.handle;
    navigate(`/thread/${authorHandle}/${postId}`);
  };

  if (!tag) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No community specified</h1>
          <p className="text-muted-foreground">Please select a community to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              {community ? (
                <>
                <h1 className="text-4xl font-bold">{community.name}</h1>
                <h1 className="text-2xl">#{tag}</h1>
                </>
              ) : (
                <>
                <h1 className="text-4xl font-bold">#{tag}</h1>
                <Button
                  onClick={() => navigate(`/community/new?tag=${tag.replace(/^#/, '')}`)}
                  variant="outline"
                >
                Claim this community
              </Button>
              </>
              )}
              
              {isCommunityLoading && (
                <div className="h-8 w-32 bg-accent animate-pulse rounded"></div>
              ) }
            </div>
          </div>
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
