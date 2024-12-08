import React from 'react';
import { EmbedView } from '../types';

interface EmbedContentProps {
  embed: EmbedView;
}

export function EmbedContent({ embed }: EmbedContentProps) {
  if (!embed.images || embed.images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {embed.images.map((image, index) => (
        <div key={index} className="relative">
          {image.image?.ref?.$link && (
            <img
              src={image.image.ref.$link}
              alt={image.alt}
              className="rounded-lg w-full h-auto"
            />
          )}
          {image.alt && (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {image.alt}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
