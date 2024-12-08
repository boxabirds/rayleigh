import React from 'react';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgent, useSetIsAuthenticated } from '../contexts/agent';

export function ProfileMenu() {
  const agent = useAgent();
  const setIsAuthenticated = useSetIsAuthenticated();
  const [, setLocation] = useLocation();

  const handleSignOut = () => {
    localStorage.removeItem('bsky-session');
    setIsAuthenticated(false);
    setLocation('/auth');
  };

  // Get the handle from localStorage since agent.session might not be directly accessible
  const sessionStr = localStorage.getItem('bsky-session');
  const handle = sessionStr ? JSON.parse(sessionStr).handle : null;

  if (!handle) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 hover:ring-2 hover:ring-primary transition-all">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${handle}`}
            alt={handle}
            className="w-full h-full object-cover"
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
