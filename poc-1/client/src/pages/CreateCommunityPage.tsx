import React from 'react';
import { useLocation } from 'wouter';
import { useAgent } from '../contexts/agent';
import { CreateCommunity } from '../components/CreateCommunity';

interface CommunityData {
  name: string;
  hashtag: string;
  description: string;
  rules: string;
  initialMembers: Array<{ did: string }>;
}

export default function CreateCommunityPage() {
  const [, setLocation] = useLocation();
  const agent = useAgent();

  const handleSubmit = async (community: CommunityData) => {
    try {
      if (community.hashtag) {
        setLocation(`/community/tags/${community.hashtag}`);
      } else {
        console.error('No hashtag provided for community');
        // TODO: Add error toast
      }
    } catch (error) {
      console.error('Error navigating to community:', error);
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
