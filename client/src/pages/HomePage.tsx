import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useIsAuthenticated, useAgent } from '../contexts/agent';
import { CommunityList } from "@/components/CommunityList";
import HelloWorld from "../components/HelloWorld";
import { createPath } from '../routes/config';
import { type Community } from '../types';

export default function HomePage() {
  const isAuthenticated = useIsAuthenticated();
  const agent = useAgent();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOwned, setIsLoadingOwned] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCommunities();
      fetchOwnedCommunities();
    }
  }, [isAuthenticated]);

  const fetchCommunities = async () => {
    try {
      const response = await fetch('/api/communities/my');
      if (!response.ok) throw new Error('Failed to fetch communities');
      const data = await response.json();
      setCommunities(data);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwnedCommunities = async () => {
    try {
      if (!agent?.session?.did) return;
      const response = await fetch(`/api/community/owner?did=${agent.session.did}`);
      if (!response.ok) throw new Error('Failed to fetch owned communities');
      const data = await response.json();
      setOwnedCommunities(data);
    } catch (error) {
      console.error('Error fetching owned communities:', error);
    } finally {
      setIsLoadingOwned(false);
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete community');
      setCommunities(communities.filter(c => c.id !== communityId));
      setOwnedCommunities(ownedCommunities.filter(c => c.id !== communityId));
    } catch (error) {
      console.error('Error deleting community:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Bluesky-style header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-feed mx-auto h-full px-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">Rayleigh</h1>
          <div className="flex items-center space-x-4">
            <a href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              Search
            </a>
            <ThemeToggle />
            {isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14">
        <div className="max-w-feed mx-auto px-4 py-6">
          {isAuthenticated ? (
            <div className="space-y-6">
              {/* Owned Communities Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">My Communities</h2>
                  <a
                    href={createPath('communityNew')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Create Community
                  </a>
                </div>
                
                {isLoadingOwned ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading owned communities...
                  </div>
                ) : ownedCommunities.length > 0 ? (
                  <CommunityList
                    communities={ownedCommunities}
                    currentUserDid={agent?.session?.did || ''}
                    onDeleteCommunity={handleDeleteCommunity}
                    showOwned={true}
                  />
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/50">
                    You don't own any communities yet.
                  </div>
                )}
              </div>

              {/* Member Communities Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4">Other Communities I'm In</h2>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading communities...
                  </div>
                ) : communities.length > 0 ? (
                  <CommunityList
                    communities={communities}
                    currentUserDid={agent?.session?.did || ''}
                    onDeleteCommunity={handleDeleteCommunity}
                    showOwned={false}
                  />
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/50">
                    You're not a member of any other communities yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Welcome to Rayleigh</h2>
              <p className="text-muted-foreground mb-6">
                Sign in with Bluesky to create and join communities
              </p>
              <a
                href="/auth"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Sign in with Bluesky
              </a>
              <HelloWorld />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
