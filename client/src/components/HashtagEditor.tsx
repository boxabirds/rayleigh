import React, { useState, useEffect } from 'react';

interface HashtagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  name?: string;
  maxItems?: number;
}

export const HashtagEditor: React.FC<HashtagEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter hashtags...',
  name,
  maxItems
}) => {
  const [text, setText] = useState('');

  // Convert array of tags to text on initial load
  useEffect(() => {
    setText(value.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(', '));
  }, [value]);

  const processTags = (inputText: string) => {
    // Split by commas or spaces
    let tags = inputText.split(/[,\s]+/)
      // Remove empty strings
      .filter(tag => tag.trim().length > 0)
      // Ensure each tag starts with #
      .map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`)
      // Remove duplicates
      .filter((tag, index, self) => self.indexOf(tag) === index);

    // Limit to maxItems if specified
    if (maxItems !== undefined) {
      tags = tags.slice(0, maxItems);
    }

    return tags;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Process tags and update parent immediately
    const tags = processTags(newText);
    // Remove # prefix before passing to parent
    onChange(tags.map(tag => tag.replace(/^#/, '')));
  };

  const handleBlur = () => {
    // On blur, normalize the display format
    const tags = processTags(text);
    setText(tags.join(', '));
  };

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      name={name}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  );
};
