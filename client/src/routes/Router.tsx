import React from 'react';
import { Switch, Route } from 'wouter';
import HomePage from '../pages/HomePage';
import AuthPage from '../pages/AuthPage';
import SearchPage from '../pages/SearchPage';
import CommunitySearchPage from '../pages/CommunitySearchPage';
import AICommunityPage from '../pages/AICommunityPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { routes } from './config';

export function Router() {
  return (
    <Switch>
      <Route path={routes.home.path}>
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      
      <Route path={routes.auth.path}>
        <AuthPage />
      </Route>
      
      <Route path={routes.search.path}>
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      </Route>
      
      <Route path={routes.aiSearch.path}>
        <ProtectedRoute>
          <CommunitySearchPage />
        </ProtectedRoute>
      </Route>
      
      <Route path={routes.aiCommunity.path}>
        <ProtectedRoute>
          <AICommunityPage />
        </ProtectedRoute>
      </Route>
      
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}
