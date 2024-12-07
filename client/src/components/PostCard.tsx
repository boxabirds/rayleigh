import React from 'react';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: PostView;
  replies?: PostView[];
}

interface PostRecord {
  text: string;
  $type: string;
}

interface ImageEmbed {
  images: Array<{
    thumb: string;
    alt?: string;
  }>;
}

interface EmbedView {
  $type: string;
  images?: ImageEmbed['images'];
}

export function PostCard({ post, replies = [] }: PostCardProps) {
  const timestamp = new Date(post.indexedAt);
  const record = post.record as PostRecord;
  const embed = post.embed as EmbedView | undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-start space-x-3">
        {post.author.avatar && (
          <img
            src={post.author.avatar}
            alt={post.author.handle}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {post.author.displayName || post.author.handle}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              @{post.author.handle}
            </span>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          </div>
          <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
            {record.text}
          </p>
          {embed?.images && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {embed.images.map((image, index) => (
                <img
                  key={index}
                  src={image.thumb}
                  alt={image.alt || ''}
                  className="rounded-lg max-h-64 w-full object-cover"
                />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center space-x-4 text-gray-500 dark:text-gray-400">
            <button className="flex items-center space-x-1 hover:text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.replyCount || 0}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{post.repostCount || 0}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post.likeCount || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-4 pl-8 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
          {replies.map((reply) => (
            <PostCard key={reply.uri} post={reply} />
          ))}
        </div>
      )}
    </div>
  );
}
