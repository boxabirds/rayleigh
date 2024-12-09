import { BskyAgent } from '@atproto/api';
import { 
  PostView, 
  ThreadViewPost,
  NotFoundPost,
  BlockedPost
} from '@atproto/api/dist/client/types/app/bsky/feed/defs';

export interface Thread {
  rootPost: PostView;
  replies: PostView[];
}

export class ThreadLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThreadLoadError';
  }
}

function isThreadViewPost(post: unknown): post is ThreadViewPost {
  return (
    typeof post === 'object' &&
    post !== null &&
    'post' in post &&
    'replies' in post
  );
}

function collectReplies(thread: unknown, replies: PostView[], seen = new Set<string>()) {
  if (!isThreadViewPost(thread)) {
    return;
  }

  if (!Array.isArray(thread.replies)) {
    return;
  }

  for (const reply of thread.replies) {
    if (isThreadViewPost(reply) && reply.post) {
      // Skip if we've already seen this post
      if (seen.has(reply.post.uri)) {
        continue;
      }
      seen.add(reply.post.uri);
      replies.push(reply.post);
      collectReplies(reply, replies, seen);
    }
  }
}

export function parseAtUri(uri: string): { did: string; collection: string; rkey: string } {
  const parts = uri.split('/');
  if (parts.length !== 3) {
    throw new ThreadLoadError('Invalid thread URI format');
  }
  return {
    did: parts[0],
    collection: parts[1],
    rkey: parts[2],
  };
}

export async function loadThread(agent: BskyAgent, uri: string): Promise<Thread> {
  if (!uri || !agent) {
    throw new ThreadLoadError('Missing required parameters');
  }

  try {
    // Validate URI format first
    if (!uri.includes('/')) {
      throw new ThreadLoadError('Invalid thread URI');
    }

    // Convert did:plc: format to at:// format
    const atUri = uri.startsWith('did:plc:') ? 
      `at://${uri}` : 
      uri;

    // Validate URI parts
    try {
      parseAtUri(atUri.replace('at://', ''));
    } catch (error) {
      throw new ThreadLoadError('Invalid thread URI');
    }

    const threadResponse = await agent.api.app.bsky.feed.getPostThread({
      uri: atUri,
      depth: 100,
      parentHeight: 0,
    }).catch(error => {
      if (error.status === 404) {
        throw new ThreadLoadError('Thread not found');
      }
      if (error.status === 400) {
        throw new ThreadLoadError('Invalid thread URI');
      }
      throw new ThreadLoadError('Failed to fetch thread from server');
    });

    if (!threadResponse.success) {
      throw new ThreadLoadError('Failed to fetch thread');
    }

    const threadData = threadResponse.data.thread;
    if (!threadData?.post) {
      throw new ThreadLoadError('Thread data is missing');
    }

    const rootPost = threadData.post as PostView;
    const replies: PostView[] = [];

    // Only process if it's a valid thread view
    if (isThreadViewPost(threadData)) {
      collectReplies(threadData, replies);
    }

    return { rootPost, replies };
  } catch (error) {
    if (error instanceof ThreadLoadError) {
      throw error;
    }
    throw new ThreadLoadError(
      error instanceof Error ? error.message : 'Failed to load thread'
    );
  }
}
