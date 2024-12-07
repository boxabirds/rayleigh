import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

interface ReplyRef {
  root: { uri: string; cid: string };
  parent: { uri: string; cid: string };
}

interface Thread {
  rootPost: PostView;
  children: PostView[];
  latestUpdate: string;
}

function isReplyRef(reply: unknown): reply is ReplyRef {
  return (
    typeof reply === 'object' &&
    reply !== null &&
    'parent' in reply &&
    typeof (reply as ReplyRef).parent === 'object' &&
    (reply as ReplyRef).parent !== null &&
    'uri' in (reply as ReplyRef).parent
  );
}

export interface ThreadRollupResult {
  threads: Thread[];
}

export function rollupThreads(posts: PostView[], existingThreads: Thread[] = []): ThreadRollupResult {
  const postMap = new Map<string, PostView>();
  const threadMap = new Map<string, Thread>();
  
  // First, initialize threadMap with existing threads
  existingThreads.forEach(thread => {
    threadMap.set(thread.rootPost.uri, thread);
  });

  // Build map of all posts
  posts.forEach(post => {
    postMap.set(post.uri, post);
  });

  // Process each post
  posts.forEach(post => {
    let currentPost = post;
    let rootPost: PostView | undefined;
    
    // Find the root post by traversing up
    while (currentPost.reply && isReplyRef(currentPost.reply)) {
      const parentUri = currentPost.reply.parent.uri;
      const parent = postMap.get(parentUri);
      if (!parent) {
        // If we can't find the parent in our current batch,
        // check if it's the root of an existing thread
        const existingThread = threadMap.get(parentUri);
        if (existingThread) {
          rootPost = existingThread.rootPost;
        }
        break;
      }
      currentPost = parent;
      rootPost = currentPost;
    }

    // If no root post found, this post is itself a root
    if (!rootPost) {
      rootPost = post;
    }

    // Get or create thread
    let thread = threadMap.get(rootPost.uri);
    if (!thread) {
      thread = {
        rootPost,
        children: [],
        latestUpdate: rootPost.indexedAt
      };
      threadMap.set(rootPost.uri, thread);
    }

    // Add post to thread if it's not the root
    if (post.uri !== rootPost.uri) {
      thread.children.push(post);
    }

    // Update thread's latest timestamp if needed
    if (new Date(post.indexedAt) > new Date(thread.latestUpdate)) {
      thread.latestUpdate = post.indexedAt;
    }
  });

  // Convert to array and sort by latest update
  const sortedThreads = Array.from(threadMap.values()).sort((a, b) => 
    new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime()
  );

  return {
    threads: sortedThreads
  };
}
