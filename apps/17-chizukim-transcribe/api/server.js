// Vercel Serverless Function wrapper for the Express app
import express from 'express';
import { createServer } from 'node:http';

// We need to re-export the app as a handler, not start a listening server.
// Import the built bundle and intercept the listen call.

let _app = null;

async function getApp() {
  if (_app) return _app;

  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Dynamically import routes from the built bundle
  const { registerRoutes } = await import('../dist/index.cjs');
  await registerRoutes(httpServer, app);

  // Serve static files (dist/public)
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.default.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.default.join(__dirname, '../dist/public');

  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.default.join(publicDir, 'index.html'));
  });

  _app = app;
  return app;
}

export default async function handler(req, res) {
  const app = await getApp();
  app(req, res);
}
