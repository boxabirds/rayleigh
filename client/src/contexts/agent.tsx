import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { BskyAgent } from '@atproto/api';

interface AgentContextValue {
  agent: BskyAgent;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context.agent;
}

export function useIsAuthenticated() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useIsAuthenticated must be used within an AgentProvider');
  }
  return context.isAuthenticated;
}

export function useSetIsAuthenticated() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useSetIsAuthenticated must be used within an AgentProvider');
  }
  return context.setIsAuthenticated;
}

interface AgentProviderProps {
  children: ReactNode;
  agent: BskyAgent;
}

export function AgentProvider({ children, agent }: AgentProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Try to restore session on mount
    const sessionStr = localStorage.getItem('bsky-session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        agent.resumeSession(session)
          .then(() => {
            setIsAuthenticated(true);
            setIsInitialized(true);
          })
          .catch(() => {
            localStorage.removeItem('bsky-session');
            setIsAuthenticated(false);
            setIsInitialized(true);
          });
      } catch {
        localStorage.removeItem('bsky-session');
        setIsAuthenticated(false);
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(true);
    }
  }, [agent]);

  const contextValue = {
    agent,
    isAuthenticated,
    setIsAuthenticated,
  };

  // Don't render children until we've checked the session
  if (!isInitialized) {
    return null;
  }

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}
