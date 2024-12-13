import React from 'react';
import { Route, useLocation } from 'wouter';
import { useRequireAuth } from '../hooks/useRequireAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

export function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  useRequireAuth();
  const [location] = useLocation();
  // console.log('ProtectedRoute:', {
  //   path,
  //   location,
  //   matches: matchPath(path, location)
  // });
  
  return (
    <Route path={path}>
      {(params) => {
        // console.log('ProtectedRoute matched with params:', params);
        return children;
      }}
    </Route>
  );
}

// Simple path matching function
function matchPath(pattern: string, path: string) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  
  return patternParts.every((part, i) => {
    if (part.startsWith(':')) return true;
    return part === pathParts[i];
  });
}
