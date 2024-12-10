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
  communityNew: {
    path: '/community/new',
    requiresAuth: true,
  },
  community: {
    path: '/community/:tag*',  // This will match /community/#tag
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
  thread: {
    path: '/thread/:threadId',
    requiresAuth: true,
  },
};

export default routes;
