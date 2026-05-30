import { Router, Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimit';

const router = Router();

// Pre-computed bcrypt hash of a random string, used to keep /login timing
// constant when the email doesn't exist (prevents user enumeration).
const DUMMY_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8e6Z6vQp1FQk5dXqXTQYqQ8eHvJTWS';

const REFRESH_TTL_MS   = 7 * 24 * 60 * 60 * 1000;  // 7 days
const REFRESH_TTL_SECS = 7 * 24 * 60 * 60;
const ACCESS_TTL       = '1m';
const ACCESS_TTL_MS    = 60_000;          // 1 minute
const ACCESS_TTL_SECS  = 60;

const isProd = process.env.NODE_ENV === 'production';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  // 'none' is required for cross-origin deployments (Vercel + Railway).
  // 'strict' silently blocks cookies when client and server are on different domains.
  sameSite: isProd ? 'none' : 'strict',
};

const accessCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: '/',
  maxAge: ACCESS_TTL_SECS * 1000,
};

const refreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: '/api/auth/refresh',
  maxAge: REFRESH_TTL_SECS * 1000,
};

// Non-HttpOnly advisory cookie so the client can skip the silent /refresh call
// when no session exists, avoiding a noisy 401 in the console on every cold visit.
// Carries no auth value — auth is still enforced by the HttpOnly refresh_token.
const hintCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  httpOnly: false,
  path: '/',
  maxAge: REFRESH_TTL_SECS * 1000,
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, accessCookieOptions);
  res.cookie('refresh_token', refreshToken, refreshCookieOptions);
  res.cookie('has_session', '1', hintCookieOptions);
}

// Express's res.clearCookie preserves maxAge from the passed options; since our
// cookie options carry a positive maxAge, the browser would keep the cleared
// (empty-value) cookie alive instead of deleting it. Pass options without maxAge.
function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token',  { ...baseCookieOptions, path: '/' });
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/api/auth/refresh' });
  res.clearCookie('has_session',   { ...baseCookieOptions, httpOnly: false, path: '/' });
}

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function makeAccessToken(id: number, email: string): string {
  return jwt.sign({ id, email }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TTL,
    algorithm: 'HS256',
  });
}

/**
 * Issue a fresh refresh token. `familyId` is the chain id — pass an existing
 * family on rotation, omit on first login.
 *
 * Accepts an optional `client` so callers inside a transaction can reuse the
 * same connection.
 */
async function makeRefreshToken(
  userId: number,
  familyId: string,
  client: PoolClient | typeof pool = pool
): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await client.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, tokenHash, familyId, expiresAt]
  );
  return token;
}

router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [body.email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [body.email, body.name, passwordHash]
  );
  const user = result.rows[0];

  const accessToken = makeAccessToken(user.id, user.email);
  const refreshToken = await makeRefreshToken(user.id, crypto.randomUUID());

  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user, accessTokenExpiresAt: Date.now() + ACCESS_TTL_MS });
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const result = await pool.query(
    'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
    [body.email]
  );
  const user = result.rows[0];

  const valid = await bcrypt.compare(body.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = makeAccessToken(user.id, user.email);
  const refreshToken = await makeRefreshToken(user.id, crypto.randomUUID());

  setAuthCookies(res, accessToken, refreshToken);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
    accessTokenExpiresAt: Date.now() + ACCESS_TTL_MS,
  });
});

/**
 * Refresh-token rotation with reuse detection.
 *
 * Each refresh token is part of a "family" (chain). On successful rotation we
 * mark the old token used and issue a new one in the same family. If a token
 * that's already been redeemed (used_at IS NOT NULL) is presented again, we
 * assume theft and invalidate the entire family — forcing re-login on every
 * device that descended from that login.
 *
 * The whole operation is one transaction so a failure mid-rotation can't
 * leave the user in a half-state (no token recorded).
 */
router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, user_id, family_id, used_at, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const row = result.rows[0];

    // Reuse detection: the token's been redeemed before. Treat as compromised.
    if (row.used_at !== null) {
      const ageMs = Date.now() - new Date(row.used_at).getTime();
      if (ageMs > 10_000) {
        // Redeemed >10s ago — genuine reuse/theft. Nuke the family.
        await client.query('DELETE FROM refresh_tokens WHERE family_id = $1', [row.family_id]);
        await client.query('COMMIT');
        res.status(401).json({ error: 'Token reuse detected — please log in again' });
        return;
      }
      // Redeemed within 10s — likely a multi-tab race, not theft.
      await client.query('COMMIT');
      res.status(409).json({ error: 'Refresh in progress, retry shortly' });
      return;
    }

    if (new Date(row.expires_at) <= new Date()) {
      await client.query('COMMIT');
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Mark the presented token as redeemed (kept around so future replays
    // trigger the reuse-detection branch above).
    await client.query('UPDATE refresh_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

    const userResult = await client.query(
      'SELECT id, email FROM users WHERE id = $1',
      [row.user_id]
    );
    if (userResult.rows.length === 0) {
      await client.query('DELETE FROM refresh_tokens WHERE family_id = $1', [row.family_id]);
      await client.query('COMMIT');
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const user = userResult.rows[0];

    const newRefreshToken = await makeRefreshToken(user.id, row.family_id, client);
    const accessToken = makeAccessToken(user.id, user.email);

    await client.query('COMMIT');
    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ accessTokenExpiresAt: Date.now() + ACCESS_TTL_MS });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken && typeof refreshToken === 'string') {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    // Wipe the whole family so all sibling tokens (other tabs, devices that
    // shared this chain) also lose access.
    await pool.query(
      `DELETE FROM refresh_tokens
       WHERE family_id = (
         SELECT family_id FROM refresh_tokens WHERE token_hash = $1
       )`,
      [tokenHash]
    );
  }
  clearAuthCookies(res);
  res.status(204).send();
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(result.rows[0]);
});

export default router;
