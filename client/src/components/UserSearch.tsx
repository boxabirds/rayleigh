import React, { useState, useEffect, KeyboardEvent } from 'react';
import { BskyAgent } from '@atproto/api';

export interface UserProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface UserSearchProps {
  agent: BskyAgent;
  onSelect: (user: UserProfile) => void;
  onRemove: (user: UserProfile) => void;
  selectedUsers: UserProfile[];
}

export const UserSearch: React.FC<UserSearchProps> = ({
  agent,
  onSelect,
  onRemove,
  selectedUsers
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await agent.searchActorsTypeahead({
          term: query,
          limit: 5
        });

        const profiles = response.data.actors.map(actor => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          avatar: actor.avatar
        }));

        setResults(profiles);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [query, agent]);

  useEffect(() => {
    // Reset selected index when results change
    setSelectedIndex(-1);
  }, [results]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && !selectedUsers.some(u => u.did === results[selectedIndex].did)) {
          onSelect(results[selectedIndex]);
          setQuery('');
          setResults([]);
        }
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search users..."
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2">Loading...</div>
        )}
        {results.length > 0 && (
          <div className="absolute w-full mt-1 bg-white border rounded-md shadow-lg">
            {results.map((user, index) => (
              <button
                key={user.did}
                onClick={() => {
                  onSelect(user);
                  setQuery('');
                  setResults([]);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 ${
                  index === selectedIndex ? 'bg-gray-100' : ''
                }`}
                disabled={selectedUsers.some(u => u.did === user.did)}
              >
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.handle}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div>{user.displayName}</div>
                  <div className="text-sm text-gray-500">@{user.handle}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedUsers.map((user) => (
          <div
            key={user.did}
            className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"
          >
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.handle}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-gray-900 dark:text-gray-100">@{user.handle}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                onRemove(user);
              }}
              className="text-gray-500 hover:text-red-500"
              aria-label="Remove user"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
