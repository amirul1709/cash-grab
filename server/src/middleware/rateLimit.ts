import rateLimit from 'express-rate-limit';

/**
 * Per-IP limits on auth endpoints.
 *
 * In-memory store — fine for single-process deployments. If we ever scale to
 * multiple server instances, swap in a Redis store (rate-limit-redis) so a
 * burst across instances still gets blocked.
 *
 * `standardHeaders: 'draft-7'` emits the RFC-style `RateLimit-*` response
 * headers; `legacyHeaders: false` suppresses the older `X-RateLimit-*` set.
 */

const common = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
};

/** 5 attempts / 15 min / IP — protects against password brute force. */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

/** 10 registrations / 24h / IP — protects against signup spam / email bombing. */
export const registerLimiter = rateLimit({
  ...common,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
});

/**
 * 30 refresh calls / 15 min / IP. A normal client refreshes ~4×/hour (access
 * token TTL = 15 min); 30 gives ample headroom for retries and parallel tabs.
 */
export const refreshLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});
