import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';

export interface PostRecord {
  text: string;
  $type: string;
  createdAt: string;
  reply?: {
    root: {
      uri: string;
      cid: string;
    };
    parent: {
      uri: string;
      cid: string;
    };
  };
}

export interface ImageEmbed {
  $type: string;
  images: {
    alt?: string;
    image: {
      ref: { $link: string };
    };
  }[];
}

export interface EmbedView extends ImageEmbed {
  $type: string;
}

export interface Thread {
  rootPost: PostView;
  replies: PostView[];
}

export interface ThreadViewPost {
  post: PostView;
  parent?: ThreadViewPost;
  replies?: ThreadViewPost[];
}

// These types match what comes from the server
export interface Community {
  id: string;
  name: string;
  description: string;
  rules: string;
  hashtag: string;
  creatorDid: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  communityId: string;
  memberDid: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface CommunityTag {
  communityId: string;
  tag: string;
  type: 'post' | 'channel';
}
