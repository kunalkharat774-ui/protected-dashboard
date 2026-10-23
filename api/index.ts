import { createApiHandler } from '../vercel-api';

export const config = {
  maxDuration: 300,
};

export default createApiHandler();
