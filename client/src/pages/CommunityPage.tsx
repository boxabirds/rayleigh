import React, { useState, useCallback } from 'react';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { rollupThreads } from '../utils/threadRollup';
import { useParams, useLocation } from 'wouter';
import { ThemeToggle } from '../components/theme-toggle';
import { PostCard } from '../components/PostCard';

interface Thread {
  rootPost: PostView;
  children: PostView[];
  latestUpdate: string;
}

export default function CommunityPage() {
  const agent = useRequireAuth();
  const { tag } = useParams<{ tag: string }>();
  const [, navigate] = useLocation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const fetchPosts = useCallback(async () => {
    if (!agent || isLoading || !hasMore || !tag) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await agent.api.app.bsky.feed.searchPosts({
        q: `#${tag}`,
        limit: 50,
        cursor: cursor,
      });
      
      const result = rollupThreads(response.data.posts, threads);
      
      setThreads(prevThreads => {
        const existingThreadMap = new Map(prevThreads.map(t => [t.rootPost.uri, t]));
        
        result.threads.forEach(newThread => {
          const existingThread = existingThreadMap.get(newThread.rootPost.uri);
          if (existingThread) {
            if (new Date(newThread.latestUpdate) > new Date(existingThread.latestUpdate)) {
              existingThreadMap.set(newThread.rootPost.uri, newThread);
            }
          } else {
            existingThreadMap.set(newThread.rootPost.uri, newThread);
          }
        });

        return Array.from(existingThreadMap.values())
          .sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
      });
      
      setCursor(response.data.cursor);
      setHasMore(!!response.data.cursor);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again.');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent, isLoading, hasMore, cursor, threads, tag]);

  const handleThreadClick = useCallback((thread: Thread) => {
    const postId = thread.rootPost.uri.split('/').pop() || '';
    const threadPath = `${thread.rootPost.author.handle}/${postId}`;
    navigate(`/thread/${encodeURIComponent(threadPath)}`);
  }, [navigate]);

  React.useEffect(() => {
    if (agent && threads.length === 0 && tag) {
      fetchPosts();
    }
  }, [agent, fetchPosts, threads.length, tag]);

  React.useEffect(() => {
    setThreads([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
  }, [tag]);

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
          {threads.map((thread) => (
            <div 
              key={thread.rootPost.uri}
              onClick={() => handleThreadClick(thread)}
              className="cursor-pointer transition-colors hover:bg-accent/50 rounded-lg"
            >
              <PostCard 
                post={thread.rootPost} 
                replies={thread.children}
              />
            </div>
          ))}

          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-accent rounded-lg"></div>
              <div className="h-24 bg-accent rounded-lg"></div>
            </div>
          )}

          {!isLoading && threads.length === 0 && (
            <p className="text-muted-foreground">No posts found for #{tag}</p>
          )}

          {hasMore && !isLoading && (
            <button
              onClick={() => fetchPosts()}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
