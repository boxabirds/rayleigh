import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmbedContent } from '../EmbedContent';

describe('EmbedContent', () => {
  it('should render nothing when no images are provided', () => {
    const { container } = render(<EmbedContent embed={{ $type: 'app.bsky.embed.images#view', images: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render images with alt text', () => {
    const embed = {
      $type: 'app.bsky.embed.images#view',
      images: [
        {
          image: { ref: { $link: 'https://example.com/image1.jpg' } },
          alt: 'Test image 1',
        },
        {
          image: { ref: { $link: 'https://example.com/image2.jpg' } },
          alt: 'Test image 2',
        },
      ],
    };

    render(<EmbedContent embed={embed} />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Test image 1');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/image2.jpg');
    expect(images[1]).toHaveAttribute('alt', 'Test image 2');
  });

  it('should handle images without alt text', () => {
    const embed = {
      $type: 'app.bsky.embed.images#view',
      images: [
        {
          image: { ref: { $link: 'https://example.com/image1.jpg' } },
        },
      ],
    };

    render(<EmbedContent embed={embed} />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    expect(images[0].hasAttribute('alt')).toBe(false);
  });
});
