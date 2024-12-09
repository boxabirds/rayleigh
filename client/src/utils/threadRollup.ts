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

export function rollupThreads(posts: PostView[], existingThreads: Thread[] = [], tag: string): ThreadRollupResult {
  const postMap = new Map<string, PostView>();
  const threadMap = new Map<string, Thread>();
  
  // First, initialize threadMap with existing threads
  existingThreads.forEach(thread => {
    threadMap.set(thread.rootPost.uri, {
      rootPost: thread.rootPost,
      children: [...thread.children], // Create a new array to avoid modifying the original
      latestUpdate: thread.latestUpdate
    });
  });

  // Build map of all posts
  posts.forEach(post => {
    postMap.set(post.uri, post);
  });

  // Process each post
  posts.forEach(post => {
    // Skip if this post doesn't have the community tag
    const postText = (post.record as any).text.toLowerCase();
    const hasTag = postText.includes(`#${tag.toLowerCase()}`);
    if (!hasTag) {
      return;
    }

    // If this is a reply, try to find its thread
    if (post.reply && isReplyRef(post.reply)) {
      const rootUri = post.reply.root.uri;
      let thread = threadMap.get(rootUri);

      // If we found a thread and this post isn't already in its children
      if (thread && !thread.children.some(child => child.uri === post.uri)) {
        thread.children.push(post);
        if (new Date(post.indexedAt) > new Date(thread.latestUpdate)) {
          thread.latestUpdate = post.indexedAt;
        }
      }
      return;
    }

    // This is a root post, get or create its thread
    let thread = threadMap.get(post.uri);
    if (!thread) {
      thread = {
        rootPost: post,
        children: [],
        latestUpdate: post.indexedAt
      };
      threadMap.set(post.uri, thread);
    }

    // Process all posts to find children of this root post
    posts.forEach(potentialChild => {
      if (potentialChild.uri === post.uri) return; // Skip the root post itself
      
      // Check if child post has the tag
      const childText = (potentialChild.record as any).text.toLowerCase();
      const childHasTag = childText.includes(`#${tag.toLowerCase()}`);
      if (!childHasTag) return;

      // Check if this post is already in the thread's children
      if (thread.children.some(child => child.uri === potentialChild.uri)) {
        return;
      }

      let currentPost = potentialChild;
      while (currentPost.reply && isReplyRef(currentPost.reply)) {
        if (currentPost.reply.root.uri === post.uri) {
          // This is a descendant of our root post
          thread.children.push(potentialChild);
          
          // Update thread's latest timestamp if needed
          if (new Date(potentialChild.indexedAt) > new Date(thread.latestUpdate)) {
            thread.latestUpdate = potentialChild.indexedAt;
          }
          break;
        }
        
        const parentUri = currentPost.reply.parent.uri;
        currentPost = postMap.get(parentUri) || currentPost;
        
        // If we can't find the parent in our current batch, stop traversing
        if (!postMap.has(parentUri)) break;
      }
    });
  });

  // Convert to array and sort by latest update
  const sortedThreads = Array.from(threadMap.values()).sort((a, b) => 
    new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime()
  );

  return {
    threads: sortedThreads
  };
}
