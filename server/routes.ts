import type { Express } from "express";

export function registerRoutes(app: Express) {
  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
}
