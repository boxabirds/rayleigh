import React, { useState } from 'react';
import { BskyAgent } from '@atproto/api';
import { HashtagEditor } from './HashtagEditor';
import { UserSearch } from './UserSearch';
import type { UserProfile } from './UserSearch';

interface CreateCommunityProps {
  agent: BskyAgent;
  onSubmit: (data: {
    name: string;
    postTags: string[];
    description: string;
    rules: string;
    channels: string[];
    initialMembers: UserProfile[];
  }) => Promise<void>;
}

export const CreateCommunity: React.FC<CreateCommunityProps> = ({
  agent,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [initialMembers, setInitialMembers] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        postTags,
        description,
        rules,
        channels,
        initialMembers
      });
    } catch (error) {
      console.error('Error creating community:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Community Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={256}
          required
          className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Post Hashtags
        </label>
        <HashtagEditor
          value={postTags}
          onChange={setPostTags}
          placeholder="Enter hashtags for posts..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Community Rules (Markdown)
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          required
          rows={5}
          className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Initial Channels
        </label>
        <HashtagEditor
          value={channels}
          onChange={setChannels}
          placeholder="Enter channel hashtags..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Initial Members
        </label>
        <UserSearch
          agent={agent}
          onSelect={(user) => setInitialMembers([...initialMembers, user])}
          onRemove={(user) => setInitialMembers(initialMembers.filter(u => u.did !== user.did))}
          selectedUsers={initialMembers}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Community'}
      </button>
    </form>
  );
};
