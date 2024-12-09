import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useParams, useLocation } from 'wouter';
import { PostView, ThreadViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { PostCard } from '../components/PostCard';
import { BskyAgent } from '@atproto/api';

interface Thread {
  rootPost: PostView;
  replies: PostView[];
}

async function loadThread(agent: BskyAgent, uri: string): Promise<Thread | null> {
  try {
    const threadResponse = await agent.getPostThread({ uri });
    
    if (!threadResponse.success || !threadResponse.data.thread) {
      throw new ThreadLoadError('Thread not found');
    }

    const thread = threadResponse.data.thread;
    if (thread.notFound || !('post' in thread)) {
      throw new ThreadLoadError('Thread not found');
    }

    console.log('Thread response:', JSON.stringify(threadResponse.data.thread, null, 2));

    const rootPost = thread.post as PostView;
    const replies: PostView[] = [];

    // Extract replies if they exist
    if ('replies' in thread && Array.isArray(thread.replies)) {
      thread.replies.forEach(reply => {
        if ('post' in reply) {
          replies.push(reply.post as PostView);
        }
      });
      
      // Sort replies by creation time, oldest first
      replies.sort((a, b) => {
        const timeA = new Date(a.indexedAt).getTime();
        const timeB = new Date(b.indexedAt).getTime();
        return timeA - timeB;
      });
    }

    return {
      rootPost,
      replies
    };
  } catch (error) {
    console.error('Error in loadThread:', error);
    throw error;
  }
}

class ThreadLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThreadLoadError';
  }
}

export function ThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const [location, setLocation] = useLocation();
  const agent = useRequireAuth();
  
  console.log('ThreadPage render:', {
    params,
    threadId,
    location,
    hasAgent: !!agent,
  });

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleBack = () => {
    window.history.back();
  };

  const handleRetry = () => {
    console.log('handleRetry start');
    setRetryCount(count => count + 1);
  };

  const BackButton = () => (
    <button
      onClick={handleBack}
      className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Back</span>
    </button>
  );

  useEffect(() => {
    console.log('ThreadPage effect running');
    async function fetchThread() {
      console.log('fetchThread start');
      if (!threadId) {
        console.log('No threadId');
        setError('No thread ID provided');
        setLoading(false);
        return;
      }

      if (!agent) {
        console.log('No agent');
        setError('Please sign in to view threads');
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);
        
        // Parse handle/postId format
        const decodedPath = decodeURIComponent(threadId);
        const [handle, postId] = decodedPath.split('/');
        
        if (!handle || !postId) {
          throw new Error('Invalid thread path');
        }

        // First resolve the DID
        const profile = await agent.getProfile({ actor: handle });
        if (!profile.success) {
          throw new Error('Could not resolve profile');
        }

        // Construct the AT URI
        const fullUri = `at://${profile.data.did}/app.bsky.feed.post/${postId}`;
        console.log('Loading thread:', { 
          threadId, 
          handle,
          postId,
          did: profile.data.did,
          fullUri 
        });
        
        const threadData = await loadThread(agent, fullUri);
        console.log('Thread loaded:', threadData);
        
        if (!threadData?.rootPost) {
          console.log('No root post');
          throw new Error('Thread not found');
        }
        setThread(threadData);
      } catch (error) {
        console.error('Error loading thread:', error);
        setError(
          error instanceof ThreadLoadError
            ? error.message
            : 'Unable to load this thread. It may have been deleted or you may not have permission to view it.'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchThread();
  }, [threadId, agent, retryCount]);

  if (loading) {
    console.log('loading');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <BackButton />
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('error');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <BackButton />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!thread?.rootPost) {
    console.log('no root post');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <BackButton />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-600 dark:text-yellow-400">Thread not found</p>
        </div>
      </div>
    );
  }

  console.log('rendering thread');
  const rootPost = thread.rootPost as PostView;
  const postId = rootPost.uri.split('app.bsky.feed.post/')[1] as string;
  const replies = thread.replies;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <BackButton />
      {rootPost && (
        <div className="space-y-4">
          <PostCard post={rootPost} />
          
          {replies.length > 0 && (
            <div className="pl-4 border-l-2 border-border space-y-4">
              {replies.map((reply) => (
                <PostCard key={reply.uri} post={reply} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
