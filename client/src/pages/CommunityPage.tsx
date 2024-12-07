import React, { useState, useCallback } from 'react';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { rollupThreads, ThreadRollupResult } from '../utils/threadRollup';
import { PostCard } from '../components/PostCard';
import { useParams } from 'wouter';

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">#{tag} Community</h1>
      <div className="space-y-4">
        {threads.map(thread => (
          <PostCard key={thread.rootPost.uri} post={thread.rootPost} />
        ))}
        
        {hasMore && (
          <button
            onClick={fetchPosts}
            disabled={isLoading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading older posts...</span>
              </>
            ) : (
              <span>Older posts</span>
            )}
          </button>
        )}
        
        {!hasMore && threads.length > 0 && (
          <div className="text-center text-gray-500 py-4">
            No more posts to load
          </div>
        )}

        {!isLoading && threads.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">No posts found in #{tag} community</p>
            <button
              onClick={() => {
                setThreads([]);
                setCursor(undefined);
                setHasMore(true);
                fetchPosts();
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
