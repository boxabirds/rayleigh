import React, { useState, useCallback } from 'react';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { rollupThreads, ThreadRollupResult } from '../utils/threadRollup';
import { PostCard } from '../components/PostCard';
import { useParams } from 'wouter';
import { ThemeToggle } from '../components/theme-toggle';

interface Thread {
  rootPost: PostView;
  children: PostView[];
  latestUpdate: string;
}

export default function CommunityPage() {
  const agent = useRequireAuth();
  const { tag } = useParams<{ tag: string }>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const fetchPosts = useCallback(async () => {
    if (!agent || isLoading || !hasMore || !tag) return;
    
    setIsLoading(true);
    try {
      const params: {
        q: string;
        limit: number;
        cursor?: string;
      } = {
        q: `#${tag}`,
        limit: 50, // Fetch more to account for replies
      };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      const response = await agent.api.app.bsky.feed.searchPosts(params);
      
      // Roll up threads, including existing ones for proper merging
      const result = rollupThreads(response.data.posts, threads);
      
      // Keep all threads, limited to 25 per page
      setThreads(prevThreads => {
        // Create a map of existing threads by root URI for quick lookup
        const existingThreadMap = new Map(prevThreads.map(t => [t.rootPost.uri, t]));
        
        // Merge new threads with existing ones
        result.threads.forEach(newThread => {
          const existingThread = existingThreadMap.get(newThread.rootPost.uri);
          if (existingThread) {
            // Update existing thread if new one is more recent
            if (new Date(newThread.latestUpdate) > new Date(existingThread.latestUpdate)) {
              existingThreadMap.set(newThread.rootPost.uri, newThread);
            }
          } else {
            // Add new thread
            existingThreadMap.set(newThread.rootPost.uri, newThread);
          }
        });

        // Convert back to array and sort by latest update
        return Array.from(existingThreadMap.values())
          .sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime());
      });
      
      setCursor(response.data.cursor);
      setHasMore(!!response.data.cursor);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent, isLoading, hasMore, cursor, threads, tag]);

  // Initial load
  React.useEffect(() => {
    if (agent && threads.length === 0 && tag) {
      fetchPosts();
    }
  }, [agent, fetchPosts, threads.length, tag]);

  // Reset state when tag changes
  React.useEffect(() => {
    setThreads([]);
    setCursor(undefined);
    setHasMore(true);
  }, [tag]);

  if (!tag) {
    return <div>Invalid community tag</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">#{tag} Community</h1>
        <ThemeToggle />
      </div>
      
      {threads.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No posts found in this community.</p>
          <button
            onClick={() => {
              setThreads([]);
              setCursor(undefined);
              setHasMore(true);
              void fetchPosts();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Check for New Posts
          </button>
        </div>
      )}

      <div className="space-y-4">
        {threads.map((thread) => (
          <PostCard
            key={thread.rootPost.uri}
            post={thread.rootPost}
            replies={thread.children}
          />
        ))}
      </div>

      {hasMore && !isLoading && threads.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={() => void fetchPosts()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Load More
          </button>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      )}
    </div>
  );
}
