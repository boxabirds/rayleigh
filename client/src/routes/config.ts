interface RouteConfig {
  path: string;
  requiresAuth: boolean;
}

export const routes: Record<string, RouteConfig> = {
  home: {
    path: '/',
    requiresAuth: true,
  },
  auth: {
    path: '/auth',
    requiresAuth: false,
  },
  search: {
    path: '/search',
    requiresAuth: true,
  },
  aiSearch: {
    path: '/search/ai',
    requiresAuth: true,
  },
  aiCommunity: {
    path: '/community/ai',
    requiresAuth: true,
  },
};
