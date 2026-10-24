import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '.env.local') });
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

async function startServer() {
  if (process.argv.includes('--production')) {
    process.env.NODE_ENV = 'production';
  }

  const app = await createApp(false);
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const preferredPort = Number.parseInt(process.env.PORT || '5173', 10);
  const requestedPort = Number.isFinite(preferredPort) && preferredPort > 0 ? preferredPort : 5173;
  const listenOnPort = (port: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const server = app.listen(port, () => resolve(port));
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && port < requestedPort + 20) {
          void listenOnPort(port + 1).then(resolve, reject);
          return;
        }
        reject(error);
      });
    });

  const port = await listenOnPort(requestedPort);
  console.log(`Security Dashboard Server listening on http://0.0.0.0:${port}`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
