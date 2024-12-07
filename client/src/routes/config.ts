interface RouteConfig {
  path: string;
  requiresAuth: boolean;
}

const routes: Record<string, RouteConfig> = {
  home: {
    path: '/',
    requiresAuth: true,
  },
  auth: {
    path: '/auth',
    requiresAuth: false,
  },
  community: {
    path: '/community/:tag',
    requiresAuth: true,
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

export default routes;
