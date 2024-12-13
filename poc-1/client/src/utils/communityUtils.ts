import { BskyAgent } from '@atproto/api';
import { PostView, ReplyRef } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { ComAtprotoRepoCreateRecord } from '@atproto/api';

export interface CommunityPost {
  post: PostView;
  latestReplyAt: string;
}

export interface Community {
  uri: string;
  cid: string;
  name: string;
  description: string;
  tag: string;
  createdAt: string;
  visibility: 'public' | 'private';
  rules?: string[];
}

export interface CommunityMember {
  did: string;
  handle: string;
  displayName?: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
}

export interface GetParentPostsResult {
  posts: CommunityPost[];
  cursor?: string;
}

export type SortOrder = 'recent' | 'top';

export async function createCommunity(
  agent: BskyAgent,
  name: string,
  description: string,
  tag: string,
  visibility: 'public' | 'private' = 'public',
  rules?: string[]
): Promise<Community> {
  const record = {
    $type: 'app.rayleigh.community',
    name,
    description,
    tag,
    visibility,
    rules,
    createdAt: new Date().toISOString()
  };

  const response = await agent.api.com.atproto.repo.createRecord({
    repo: agent.session?.did || '',
    collection: 'app.rayleigh.community',
    record
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    ...record
  } as Community;
}

export async function getParentPosts(
  agent: BskyAgent,
  tag: string,
  cursor?: string,
  maxPosts: number = 100,
  sortOrder: SortOrder = 'recent',
  memberFilter?: Set<string>,
  includeAll: boolean = false
): Promise<GetParentPostsResult> {
  const allParentPosts: CommunityPost[] = [];
  let currentCursor = cursor;
  const seenUris = new Set<string>();
  
  // Continue until we have enough parent posts
  while (allParentPosts.length < maxPosts) {
    const response = await agent.api.app.bsky.feed.searchPosts({
      q: `#${tag}`,
      limit: 20,  // Fixed page size
      cursor: currentCursor,
    });

    // If no more posts or empty response, break
    if (!response.data.posts?.length) break;

    // Filter to find parent posts
    const newParentPosts = response.data.posts
      .filter(post => {
        // Skip if we've seen this URI before
        if (seenUris.has(post.uri)) return false;
        seenUris.add(post.uri);

        // Must be a parent post (no reply field)
        const record = post.record as any;
        if (record.reply) return false;

        // Must have the community tag
        const postText = record.text.toLowerCase();
        const hasTag = postText.includes(`#${tag.toLowerCase()}`);
        if (!hasTag) return false;

        // If we're not including all posts and we have a member filter,
        // check if the post author is a member
        if (!includeAll && memberFilter && !memberFilter.has(post.author.did)) {
          return false;
        }

        return true;
      })
      .map(post => ({
        post,
        latestReplyAt: post.indexedAt // Start with post's own timestamp
      }));

    // Create a map for quick lookup of parent posts
    const parentPostMap = new Map(
      [...allParentPosts, ...newParentPosts].map(p => [p.post.uri, p])
    );

    // Update latestReplyAt based on replies
    response.data.posts.forEach(post => {
      const reply = post.reply as ReplyRef;
      if (!reply || !reply.root?.uri || typeof reply.root.uri !== 'string') return;

      // Find the root post if it exists
      const parentPost = parentPostMap.get(reply.root.uri);
      if (parentPost && new Date(post.indexedAt) > new Date(parentPost.latestReplyAt)) {
        parentPost.latestReplyAt = post.indexedAt;
      }
    });

    // Add new parent posts to our collection
    allParentPosts.push(...newParentPosts);

    // If no cursor, break
    if (!response.data.cursor) break;
    currentCursor = response.data.cursor;
  }

  // Sort based on the specified order
  const sortedPosts = allParentPosts.sort((a, b) => {
    if (sortOrder === 'top') {
      // Sort by likes, then by most recent for posts with equal likes
      const likesA = a.post.likeCount || 0;
      const likesB = b.post.likeCount || 0;
      if (likesA !== likesB) {
        return likesB - likesA;
      }
    }
    // For 'recent' or as tiebreaker for 'top'
    return new Date(b.latestReplyAt).getTime() - new Date(a.latestReplyAt).getTime();
  }).slice(0, maxPosts);

  return {
    posts: sortedPosts,
    cursor: currentCursor,
  };
}

export async function getCommunityByTag(agent: BskyAgent, tag: string): Promise<Community | null> {
  try {
    const cleanTag = tag.replace(/^#/, '');
    const response = await fetch(`/api/communities/${cleanTag}`);
    
    if (!response.ok) {
      return null;
    }
    
    const community = await response.json();
    return community;
  } catch (error) {
    console.error('Error fetching community:', error);
    return null;
  }
}
