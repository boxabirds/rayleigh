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
  maxPosts: number = 25
): Promise<GetParentPostsResult> {
  const response = await agent.api.app.bsky.feed.searchPosts({
    q: `#${tag}`,
    limit: maxPosts * 2, // Fetch more to account for filtering
    cursor,
  });

  // Filter to only parent posts with the tag and transform to CommunityPost format
  const communityPosts = response.data.posts
    .filter(post => {
      // Must be a parent post (no reply field)
      const record = post.record as any;
      if (record.reply) return false;

      // Must have the community tag
      const postText = record.text.toLowerCase();
      return postText.includes(`#${tag.toLowerCase()}`);
    })
    .map(post => ({
      post,
      latestReplyAt: post.indexedAt // Start with post's own timestamp
    }));

  // Update latestReplyAt based on replies
  response.data.posts.forEach(post => {
    const reply = post.reply as ReplyRef;
    if (!reply) return;

    // Find the root post if it's in our filtered set
    const parentPost = communityPosts.find(p => reply.root.uri === p.post.uri);

    if (parentPost && new Date(post.indexedAt) > new Date(parentPost.latestReplyAt)) {
      parentPost.latestReplyAt = post.indexedAt;
    }
  });

  // Sort by most recent activity and limit to maxPosts
  const sortedPosts = communityPosts
    .sort((a, b) => new Date(b.latestReplyAt).getTime() - new Date(a.latestReplyAt).getTime())
    .slice(0, maxPosts);

  return {
    posts: sortedPosts,
    cursor: response.data.cursor,
  };
}
