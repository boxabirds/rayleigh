import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAgent } from '../contexts/agent';

export function useRequireAuth() {
  const agent = useAgent();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a session
        const storedSession = localStorage.getItem('bsky-session');
        if (!storedSession) {
          // Save the current location to redirect back after auth
          const returnPath = encodeURIComponent(location);
          setLocation(`/auth?return=${returnPath}`);
          return;
        }
        
        const session = JSON.parse(storedSession);
        const hasSession = await agent.resumeSession(session);
        if (!hasSession) {
          // Save the current location to redirect back after auth
          const returnPath = encodeURIComponent(location);
          setLocation(`/auth?return=${returnPath}`);
        }
      } catch (error) {
        // If there's an error, we're not authenticated
        const returnPath = encodeURIComponent(location);
        setLocation(`/auth?return=${returnPath}`);
      }
    };
    
    checkAuth();
  }, [agent, location, setLocation]);
  
  return agent;
}
