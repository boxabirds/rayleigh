import React from 'react';

interface RichTextProps {
  text: string;
}

export function RichText({ text }: RichTextProps) {
  // For now, just render the text as is
  // In the future, we can add support for mentions, links, etc.
  return <span>{text}</span>;
}
