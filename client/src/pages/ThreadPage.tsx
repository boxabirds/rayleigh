import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useParams, useLocation } from 'wouter';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { AppBskyFeedPost } from '@atproto/api';
import { PostCard } from '../components/PostCard';
import { loadThread, ThreadPresentation } from '../utils/threadPresentation';

interface ThreadState {
  presentation: ThreadPresentation | null;
  loading: boolean;
  error: string | null;
}

export function ThreadPage() {
  const params = useParams<{ handle: string, postId: string }>();
  const handle = params?.handle;
  const postId = params?.postId;

  const [location, setLocation] = useLocation();
  const agent = useRequireAuth();
  
  console.log('ThreadPage render:', {
    params,
    postId,
    location,
    hasAgent: !!agent,
  });

  const [state, setState] = useState<ThreadState>({
    presentation: null,
    loading: true,
    error: null
  });

  const handleBack = () => {
    window.history.back();
  };

  const handleRetry = () => {
    console.log('handleRetry start');
    setState(prev => ({ ...prev, loading: true, error: null }));
  };

  useEffect(() => {
    console.log('ThreadPage effect running');
    async function fetchThread() {
      console.log('fetchThread start');
      if (!postId) {
        console.log('No postId');
        setState(prev => ({ ...prev, error: 'No thread ID provided', loading: false }));
        return;
      }

      if (!agent) {
        console.log('No agent');
        setState(prev => ({ ...prev, error: 'Please sign in to view threads', loading: false }));
        return;
      }

      try {
        setState(prev => ({ ...prev, error: null, loading: true }));
        
        // Parse handle/postId format
        
        if (!handle || !postId) {
          setState(prev => ({ ...prev, error: 'handle or postId missing from path', loading: false }));
          return;
        }

        // First resolve the DID
        const profile = await agent.getProfile({ actor: handle });
        if (!profile.success) {
          setState(prev => ({ ...prev, error: 'Could not find user profile', loading: false }));
          return;
        }

        // Construct the AT URI
        const fullUri = `at://${profile.data.did}/app.bsky.feed.post/${postId}`;
        console.log('Loading post thread:', { 
          handle,
          postId,
          did: profile.data.did,
          fullUri 
        });
        
        const presentation = await loadThread(agent, fullUri);
        console.log('Thread loaded:', {
          hasPresentation: !!presentation,
          parentPostUri: presentation?.parentPost?.uri,
          parentPostText: presentation?.parentPost ? (presentation.parentPost.record as any).text : null,
          directChildrenCount: presentation?.directChildren?.length,
          directChildren: presentation?.directChildren?.map(dc => ({
            uri: dc.post.uri,
            text: (dc.post.record as any).text,
            firstChildrenCount: dc.firstChildrenSequence.length
          }))
        });
        
        if (!presentation) {
          setState(prev => ({ ...prev, error: 'Thread not found', loading: false }));
          return;
        }
        
        setState({ presentation, loading: false, error: null });
      } catch (error) {
        console.error('Error loading thread:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'An error occurred loading the thread',
          loading: false
        }));
      }
    }

    fetchThread();
  }, [handle, postId, agent]);

  if (state.loading) {
    console.log('loading');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (state.error) {
    console.log('error');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 mb-2">{state.error}</p>
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

  if (!state.presentation) {
    console.log('no presentation');
    return (
      <div className="max-w-2xl mx-auto p-4">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-600 dark:text-yellow-400">Thread not found</p>
        </div>
      </div>
    );
  }

  console.log('rendering thread');
  const { presentation } = state;

  console.log('Full thread presentation:', {
    parentPost: {
      uri: presentation.parentPost.uri,
      text: (presentation.parentPost.record as any).text,
      author: {
        handle: presentation.parentPost.author.handle,
        displayName: presentation.parentPost.author.displayName
      }
    },
    directChildrenCount: presentation.directChildren.length,
    directChildren: presentation.directChildren.map(dc => ({
      uri: dc.post.uri,
      text: (dc.post.record as any).text,
      firstChildrenSequence: dc.firstChildrenSequence.map(fc => ({
        uri: fc.uri,
        text: (fc.record as any).text
      }))
    }))
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={handleBack}
        className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </button>
      <div className="space-y-4">
        {/* Parent Post */}
        <PostCard post={presentation.parentPost} />
        
        {/* Direct Children and their sequences */}
        {presentation.directChildren.length > 0 && (
          <div className="space-y-4">
            {presentation.directChildren.map((childPresentation) => (
              <div key={childPresentation.post.uri} className="relative">
                {/* Vertical line for the entire child sequence */}
                <div 
                  className="absolute left-6 top-0 bottom-0 bg-gray-300 dark:bg-gray-600"
                  style={{ marginLeft: '-1px', width: '2px' }}
                />
                
                {/* Direct child post */}
                <div className="relative">
                  <PostCard post={childPresentation.post} />
                </div>
                
                {/* First Children Sequence */}
                {childPresentation.firstChildrenSequence.map((firstChild) => (
                  <div key={firstChild.uri} className="relative">
                    <PostCard post={firstChild} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
