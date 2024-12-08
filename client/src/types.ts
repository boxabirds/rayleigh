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
