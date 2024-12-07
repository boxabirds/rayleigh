import React from 'react';
import { Switch, Route } from 'wouter';
import routes from './config';
import { ProtectedRoute } from '../components/ProtectedRoute';
import AuthPage from '../pages/AuthPage';
import HomePage from '../pages/HomePage';
import CommunityPage from '../pages/CommunityPage';

export default function Router() {
  return (
    <Switch>
      <Route path={routes.auth.path} component={AuthPage} />
      
      <ProtectedRoute path={routes.home.path}>
        <HomePage />
      </ProtectedRoute>

      <ProtectedRoute path={routes.community.path}>
        <CommunityPage />
      </ProtectedRoute>
    </Switch>
  );
}
