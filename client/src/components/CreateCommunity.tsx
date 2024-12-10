import React, { useState, useEffect, useCallback } from 'react';
import { BskyAgent } from '@atproto/api';
import { HashtagEditor } from './HashtagEditor';
import { UserSearch } from './UserSearch';
import type { UserProfile } from './UserSearch';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/solid';
import debounce from 'lodash/debounce';
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";

interface CreateCommunityProps {
  agent: BskyAgent;
  onSubmit: (data: {
    name: string;
    hashtag: string;
    description: string;
    rules: string;
    initialMembers: UserProfile[];
  }) => Promise<void>;
}

interface HashtagValidation {
  isValid: boolean;
  isChecking: boolean;
  error?: string;
}

export const CreateCommunity: React.FC<CreateCommunityProps> = ({
  agent,
  onSubmit
}) => {
  const [name, setName] = useState('Photography Enthusiasts');
  const [hashtag, setHashtag] = useState('photography');
  const [description, setDescription] = useState('A community for sharing photography tips, gear recommendations, and beautiful shots.');
  const [rules, setRules] = useState(`# Community Guidelines

1. Share only your own work
2. Include camera settings in your posts
3. Be constructive in your feedback
4. No spam or self-promotion`);
  const [initialMembers, setInitialMembers] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hashtagValidation, setHashtagValidation] = useState<HashtagValidation>({
    isValid: false,
    isChecking: false
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const checkHashtagAvailability = useCallback(
    debounce(async (tag: string) => {
      if (!tag) {
        setHashtagValidation({ isValid: false, isChecking: false });
        return;
      }

      setHashtagValidation(prev => ({ ...prev, isChecking: true }));
      try {
        const response = await fetch(`/api/communities/${tag}`);
        const isAvailable = response.status === 404;
        setHashtagValidation({
          isValid: isAvailable,
          isChecking: false,
          error: isAvailable ? undefined : 'Hashtag already in use for another community'
        });
      } catch (error) {
        setHashtagValidation({
          isValid: false,
          isChecking: false,
          error: 'Error checking hashtag availability'
        });
      }
    }, 2000),
    []
  );

  useEffect(() => {
    if (hashtag) {
      checkHashtagAvailability(hashtag);
    }
  }, [hashtag, checkHashtagAvailability]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!agent.session?.did) {
      console.error('No user DID found');
      return;
    }

    const data = {
      name,
      description,
      rules,
      creatorDid: agent.session.did,
      hashtag,
      initialMembers,
    };

    try {
      setIsSubmitting(true);
      await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(async (response) => {
        if (response.ok) {
          const community = await response.json();
          toast({
            title: "Success!",
            description: `You have successfully created the '${name}' community!`,
          });
          setLocation(`/communities/${community.id}?newCommunity=true&communityName=${encodeURIComponent(name)}`);
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create community');
        }
      });

      await onSubmit(data);
    } catch (error) {
      console.error('Error creating community:', error);
      // TODO: Add error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim() && hashtag && hashtagValidation.isValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Community Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter community name..."
          name="name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Community Hashtag
        </label>
        <div className="relative">
          <HashtagEditor
            value={[hashtag]}
            onChange={(tags) => setHashtag(tags[0] || '')}
            maxItems={1}
            placeholder="Tag that links to this community"
            name="hashtag"
          />
          {hashtag && (
            <div className="absolute right-2 top-2">
              {hashtagValidation.isChecking ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
              ) : hashtagValidation.isValid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
          {hashtagValidation.error && (
            <p className="mt-1 text-sm text-red-600">{hashtagValidation.error}</p>
          )}
        </div>
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter community description..."
          name="description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Rules
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          required
          rows={6}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
          placeholder="Enter community rules (markdown supported)..."
          name="rules"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Initial Members
        </label>
        <UserSearch
          agent={agent}
          onSelect={(user) => {
            if (!initialMembers.find((m) => m.did === user.did)) {
              setInitialMembers([...initialMembers, user]);
            }
          }}
          onRemove={(user) => {
            setInitialMembers(initialMembers.filter((m) => m.did !== user.did));
          }}
          selectedUsers={initialMembers}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Community'}
        </button>
      </div>
    </form>
  );
};
