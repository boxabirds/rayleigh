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
    path: '/community/tags/:tag',  // Will match /community/tags/something
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
    path: '/thread/:handle/:postId',
    requiresAuth: true,
  },
};

export default routes;
