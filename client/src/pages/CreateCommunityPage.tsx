import React from 'react';
import { useLocation } from 'wouter';
import { useAgent } from '../contexts/agent';
import { CreateCommunity } from '@/components/CreateCommunity';
import type { UserProfile } from '@/components/UserSearch';

export default function CreateCommunityPage() {
  const [, setLocation] = useLocation();
  const agent = useAgent();

  const handleSubmit = async (data: {
    name: string;
    postTags: string[];
    description: string;
    rules: string;
    channels: string[];
    initialMembers: UserProfile[];
  }) => {
    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          creatorDid: agent?.session?.did,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create community');
      }

      const community = await response.json();
      setLocation(`/community/#${community.tag}`);
    } catch (error) {
      console.error('Error creating community:', error);
      // TODO: Add error toast
    }
  };

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create a New Community</h1>
        <CreateCommunity
          agent={agent!}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
