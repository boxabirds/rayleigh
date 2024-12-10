import React, { useState, useEffect } from 'react';

interface HashtagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const HashtagEditor: React.FC<HashtagEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter hashtags...'
}) => {
  const [text, setText] = useState('');

  // Convert array of tags to text on initial load
  useEffect(() => {
    setText(value.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(', '));
  }, [value]);

  const handleBlur = () => {
    // Split by commas or spaces
    const tags = text.split(/[,\s]+/)
      // Remove empty strings
      .filter(tag => tag.trim().length > 0)
      // Ensure each tag starts with #
      .map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`)
      // Remove duplicates
      .filter((tag, index, self) => self.indexOf(tag) === index);

    onChange(tags);
    // Update text to normalized format
    setText(tags.join(', '));
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};
