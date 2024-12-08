import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichText } from '../RichText';

describe('RichText', () => {
  it('should render plain text correctly', () => {
    const text = 'Hello, world!';
    render(<RichText text={text} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('should handle empty text', () => {
    const { container } = render(<RichText text="" />);
    expect(container.textContent).toBe('');
  });

  // Add more tests here as we add support for mentions, links, etc.
});
