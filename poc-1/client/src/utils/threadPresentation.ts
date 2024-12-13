import { PostView, ThreadViewPost, NotFoundPost, BlockedPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { BskyAgent } from '@atproto/api';
import { AppBskyFeedPost } from '@atproto/api';

interface ThreadReply {
  post: PostView;
  replies?: ThreadReply[];
}

interface DirectChildPresentation {
  post: PostView;
  firstChildrenSequence: PostView[];
}

interface ThreadPresentation {
  parentPost: PostView;
  directChildren: DirectChildPresentation[];
}

type ReplyPost = ThreadViewPost | NotFoundPost | BlockedPost | { [k: string]: unknown; $type: string; };

function findFirstChildPath(reply: ThreadReply): PostView[] {
  if (!reply || !reply.replies) {
    return [];
  }

  const path: PostView[] = [];
  let current: ThreadReply | undefined = reply;
  
  while (current?.replies?.[0]) {
    current = current.replies[0];
    if (current && current.post) {
      path.push(current.post);
    }
  }
  
  return path;
}

function normalizeUri(uri: string): string {
  if (uri.startsWith('at://')) {
    return uri;
  }
  
  if (uri.startsWith('did:plc:')) {
    const [did, ...rest] = uri.split('/');
    return `at://${did}/${rest.join('/')}`;
  }
  
  throw new Error('Invalid URI format');
}

async function getFirstChildSequence(agent: BskyAgent, post: ThreadViewPost): Promise<PostView[]> {
  const sequence: PostView[] = [];
  let current: ThreadViewPost | null = post;

  // Skip the root post since we want to start with its first child
  if (current.replies && current.replies.length > 0) {
    // Get all replies and sort them by creation time
    const sortedReplies = [...current.replies]
      .filter((reply): reply is ThreadViewPost => 'post' in reply)
      .sort((a, b) => {
        const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
        const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
        return timeA - timeB;
      });
    
    current = sortedReplies[0] || null;
  } else {
    try {
      const response = await agent.getPostThread({ 
        uri: current.post.uri,
        depth: 1,
        parentHeight: 0
      });
      
      if (!response.success || !response.data.thread) {
        return sequence;
      }

      const thread = response.data.thread as ThreadViewPost;
      if (!thread.replies || thread.replies.length === 0) {
        return sequence;
      }

      // Get all replies and sort them by creation time
      const sortedReplies = [...thread.replies]
        .filter((reply): reply is ThreadViewPost => 'post' in reply)
        .sort((a, b) => {
          const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          return timeA - timeB;
        });
      
      current = sortedReplies[0] || null;
    } catch (error) {
      return sequence;
    }
  }

  // Now follow the first-child chain
  while (current) {
    sequence.push(current.post);

    // Try to get the first child from immediate replies
    if (current.replies && current.replies.length > 0) {
      // Get all replies and sort them by creation time
      const sortedReplies = [...current.replies]
        .filter((reply): reply is ThreadViewPost => 'post' in reply)
        .sort((a, b) => {
          const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          return timeA - timeB;
        });
      
      current = sortedReplies[0] || null;
      continue;
    }

    // If no immediate replies, try to fetch them
    try {
      const response = await agent.getPostThread({ 
        uri: current.post.uri,
        depth: 1,
        parentHeight: 0
      });
      
      if (!response.success || !response.data.thread) {
        break;
      }

      const thread = response.data.thread as ThreadViewPost;
      if (!thread.replies || thread.replies.length === 0) {
        break;
      }

      // Get all replies and sort them by creation time
      const sortedReplies = [...thread.replies]
        .filter((reply): reply is ThreadViewPost => 'post' in reply)
        .sort((a, b) => {
          const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
          return timeA - timeB;
        });
      
      current = sortedReplies[0] || null;
    } catch (error) {
      break;
    }
  }

  return sequence;
}

async function loadThread(agent: BskyAgent, uri: string): Promise<ThreadPresentation | null> {
  try {
    const normalizedUri = normalizeUri(uri);
    console.log('Loading thread with URI:', normalizedUri);
    
    const response = await agent.getPostThread({ 
      uri: normalizedUri,
      depth: 1,
      parentHeight: 1
    });

    if (!response.success || !response.data.thread) {
      console.log('Failed to get thread:', response);
      return null;
    }

    const thread = response.data.thread as ThreadViewPost;
    const record = thread.post.record as AppBskyFeedPost.Record;
    console.log('Got thread:', { 
      uri: thread.post.uri,
      text: record.text,
      hasReply: 'reply' in record,
      parentUri: record.reply?.parent?.uri
    });

    // If this is a reply and we can get the parent thread, do so
    if (record.text && 'reply' in record && record.reply?.parent?.uri) {
      const parentUri = record.reply.parent.uri;
      console.log('Loading parent thread:', parentUri);
      
      const parentResponse = await agent.getPostThread({ 
        uri: parentUri,
        depth: 1,
        parentHeight: 0
      });

      if (!parentResponse.success || !parentResponse.data.thread) {
        console.log('Failed to get parent thread');
        return buildThreadPresentation(agent, thread); // Pass agent to buildThreadPresentation
      }

      const parentThread = parentResponse.data.thread as ThreadViewPost;
      const directChildren = parentThread.replies || [];
      console.log('Got parent thread with', directChildren.length, 'direct children');

      // For each direct child, get its first-child sequence
      const childrenWithSequences = await Promise.all(
        directChildren
          .filter((reply): reply is ThreadViewPost => 'post' in reply)
          .map(async (child) => {
            const sequence = await getFirstChildSequence(agent, child);
            return {
              post: child.post,
              firstChildrenSequence: sequence
            };
          })
      );

      // Sort by creation time
      childrenWithSequences.sort((a: DirectChildPresentation, b: DirectChildPresentation) => {
        const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
        const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
        return timeA - timeB;
      });

      return {
        parentPost: parentThread.post,
        directChildren: childrenWithSequences
      };
    }

    // This is a root post, just build the presentation directly
    console.log('Building presentation for root post');
    return buildThreadPresentation(agent, thread);
  } catch (error) {
    console.error('Error loading thread:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error loading thread');
  }
}

async function buildThreadPresentation(agent: BskyAgent, thread: ThreadViewPost): Promise<ThreadPresentation> {
  const parentPost = thread.post;
  const directChildren = thread.replies || [];

  // For each direct child, get its first-child sequence
  const directChildrenWithPaths: DirectChildPresentation[] = await Promise.all(
    directChildren
      .filter((reply): reply is ThreadViewPost => 'post' in reply)
      .map(async (child) => {
        const sequence = await getFirstChildSequence(agent, child);
        return {
          post: child.post,
          firstChildrenSequence: sequence
        };
      })
  );

  // Sort by creation time
  directChildrenWithPaths.sort((a: DirectChildPresentation, b: DirectChildPresentation) => {
    const timeA = new Date((a.post.record as AppBskyFeedPost.Record).createdAt).getTime();
    const timeB = new Date((b.post.record as AppBskyFeedPost.Record).createdAt).getTime();
    return timeA - timeB;
  });

  return {
    parentPost,
    directChildren: directChildrenWithPaths
  };
}

export {
  loadThread,
  buildThreadPresentation,
  getFirstChildSequence,
  normalizeUri,
  ThreadPresentation,
  DirectChildPresentation
};
