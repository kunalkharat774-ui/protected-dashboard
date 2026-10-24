import type { Request, Response } from 'express';
import { createApp } from './server.js';

export function createApiHandler() {
  let appPromise: ReturnType<typeof createApp> | undefined;

  return async (req: Request, res: Response) => {
    appPromise ??= createApp(false);
    const app = await appPromise;

    const requestUrl = new URL(req.url || '/', 'http://vercel.internal');
    const apiPath = requestUrl.searchParams.get('__vercel_api_path');
    if (apiPath) {
      const segments = apiPath.split('/');
      if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
        return res.status(400).json({ error: 'Invalid API path.' });
      }

      requestUrl.searchParams.delete('__vercel_api_path');
      const query = requestUrl.searchParams.toString();
      req.url = `/api/${segments.map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`;
    }

    return app(req, res);
  };
}
