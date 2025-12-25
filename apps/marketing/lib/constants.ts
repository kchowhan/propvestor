/**
 * Application URL constants
 * Set NEXT_PUBLIC_APP_URL environment variable in production
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const getAppUrl = (path: string = '') => {
  const baseUrl = APP_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

