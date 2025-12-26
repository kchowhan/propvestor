import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'pv_session';
export const HOMEOWNER_SESSION_COOKIE_NAME = 'pv_homeowner_session';

export const getSessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});
