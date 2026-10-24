import { createApiHandler } from '../vercel-api.js';

export const config = {
  maxDuration: 300,
};

export default createApiHandler();
