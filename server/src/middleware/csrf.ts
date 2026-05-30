import { Request, Response, NextFunction } from 'express';

/**
 * Header-based CSRF protection.
 *
 * Our cookies are SameSite=none in production (required for the cross-origin
 * Vercel + Railway split), so the browser attaches them to cross-site requests.
 * CORS stops an attacker from *reading* responses, but cookie-only endpoints
 * (/auth/refresh, /auth/logout) read no JSON body and so would otherwise still
 * execute from a cross-site auto-submitting form.
 *
 * The fix: require a custom request header on every state-changing request.
 * A non-safelisted header forces the browser to send a CORS preflight, and our
 * CORS policy only allows the configured CLIENT_URL origin — so a preflight from
 * any attacker origin is rejected before the real request ever fires. Same-origin
 * (and the legitimate client) can set the header freely.
 */

// Safe methods can't change state, so they don't need the header.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// The legitimate client sets this on every request (see client/src/api/axios.ts).
const CSRF_HEADER = 'x-requested-with';

export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (!req.headers[CSRF_HEADER]) {
    res.status(403).json({ error: 'Missing CSRF protection header' });
    return;
  }
  next();
}
