import React from 'react';
import { Switch, Route, useLocation } from 'wouter';
import routes from './config';
import { ProtectedRoute } from '../components/ProtectedRoute';
import AuthPage from '../pages/AuthPage';
import HomePage from '../pages/HomePage';
import CommunityPage from '../pages/CommunityPage';
import SearchPage from '../pages/SearchPage';
import { ThreadPage } from '../pages/ThreadPage';

export default function Router() {
  const [location] = useLocation();
  console.log('Router: Current location:', location);
  console.log('Router: Available routes:', Object.entries(routes).map(([name, route]) => ({
    name,
    path: route.path
  })));

  return (
    <Switch>
      <Route path={routes.auth.path} component={AuthPage} />
      
      <ProtectedRoute path={routes.home.path}>
        <HomePage />
      </ProtectedRoute>

      <ProtectedRoute path={routes.community.path}>
        <CommunityPage />
      </ProtectedRoute>

      <ProtectedRoute path={routes.search.path}>
        <SearchPage />
      </ProtectedRoute>

      <ProtectedRoute path={routes.thread.path}>
        <ThreadPage />
      </ProtectedRoute>

      <Route path="/:rest*">
        {(params) => {
          console.log('Router: Unmatched route with params:', params);
          return <div>Not Found</div>;
        }}
      </Route>
    </Switch>
  );
}
