import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { BskyAgent } from '@atproto/api';

interface AgentContextValue {
  agent: BskyAgent;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  refreshSession: () => Promise<void>;
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

export function useRefreshSession() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useRefreshSession must be used within an AgentProvider');
  }
  return context.refreshSession;
}

interface AgentProviderProps {
  children: ReactNode;
  agent: BskyAgent;
}

export function AgentProvider({ children, agent }: AgentProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshSession = useCallback(async () => {
    const sessionStr = localStorage.getItem('bsky-session');
    if (!sessionStr) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      await agent.resumeSession(session);
      // After successful resume, store the updated session
      localStorage.setItem('bsky-session', JSON.stringify(agent.session));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      localStorage.removeItem('bsky-session');
      setIsAuthenticated(false);
    }
  }, [agent]);

  useEffect(() => {
    // Try to restore session on mount
    refreshSession().finally(() => {
      setIsInitialized(true);
    });

    // Refresh session every 10 minutes
    const intervalId = setInterval(refreshSession, 10 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshSession]);

  const contextValue = {
    agent,
    isAuthenticated,
    setIsAuthenticated,
    refreshSession,
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
