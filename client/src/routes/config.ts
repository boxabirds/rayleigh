interface RouteConfig {
  path: string;
  requiresAuth: boolean;
}

const routes = {
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
  communityTag: {
    path: '/community/tag/:tag',
    requiresAuth: true,
  },
  search: {
    path: '/search',
    requiresAuth: true,
  },
  thread: {
    path: '/thread/:handle/:postId',
    requiresAuth: true,
  },
} as const;

export function createPath(route: keyof typeof routes, params?: Record<string, string>): string {
  const path = routes[route].path;
  if (!params) return path;
  return Object.entries(params).reduce((acc, [key, value]) => acc.replace(`:${key}`, value), path);
}

export type Routes = typeof routes;
export default routes;
