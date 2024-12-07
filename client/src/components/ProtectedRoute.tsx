import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useIsAuthenticated } from '../contexts/agent';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isAuthenticated && location !== '/auth') {
      const returnPath = encodeURIComponent(location);
      setLocation(`/auth?return=${returnPath}`);
    }
  }, [isAuthenticated, location, setLocation]);
  
  // Don't render anything while redirecting to auth
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}
