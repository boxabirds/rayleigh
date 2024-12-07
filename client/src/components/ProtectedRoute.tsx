import React from 'react';
import { Route } from 'wouter';
import { useRequireAuth } from '../hooks/useRequireAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

export function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  useRequireAuth();
  
  return (
    <Route path={path}>
      {children}
    </Route>
  );
}
