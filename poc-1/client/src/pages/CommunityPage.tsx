import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { PostCard } from '../components/PostCard';
import { ThemeToggle } from '../components/theme-toggle';
import { CommunityPost } from '../utils/communityUtils';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useCommunity } from '../hooks/useCommunity';
import { useParentPosts } from '../hooks/useParentPosts';
import { createPath } from '../routes/config';
import { parseAtUri } from '../utils/threadUtils';

interface CommunityPageProps {
  tag: string;
}

export default function CommunityPage({ tag }: CommunityPageProps) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [urlParams] = useState(() => new URLSearchParams(window.location.search));
  const includeAll = urlParams.get('scope') === 'all';

  // Use custom hooks
  const { community, isLoading: isCommunityLoading } = useCommunity(tag);
  const { 
    posts, 
    isLoading: isPostsLoading, 
    error,
    hasMore,
    loadMore,
    refresh
  } = useParentPosts(tag, community);

  // Check for new community toast
  useEffect(() => {
    if (urlParams.get('newCommunity') === 'true') {
      const communityName = urlParams.get('communityName');
      if (communityName) {
        toast({
          title: "Success!",
          description: `You have successfully created the '${communityName}' community!`,
        });
      }
    }
  }, [toast, urlParams]);

  const handlePostClick = (post: CommunityPost) => {
    const { rkey: postId } = parseAtUri(post.post.uri);
    const authorHandle = post.post.author.handle;
    navigate(createPath('thread', { handle: authorHandle, postId }));
  };

  if (!tag) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No community specified</h1>
          <p className="text-muted-foreground">Please select a community to view.</p>
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
              ) : !isCommunityLoading && (
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
              )}
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

          {isPostsLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-accent rounded-lg"></div>
              <div className="h-24 bg-accent rounded-lg"></div>
            </div>
          )}

          {!isPostsLoading && posts.length === 0 && (
            <p className="text-muted-foreground text-center">No posts found for #{tag}</p>
          )}

          {!isPostsLoading && posts.length > 0 && (
            hasMore ? (
              <button
                onClick={loadMore}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                aria-label="Load more posts"
              >
                More
              </button>
            ) : (
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
