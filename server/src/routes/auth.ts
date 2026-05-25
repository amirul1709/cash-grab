import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Pre-computed bcrypt hash of a random string, used to keep /login timing
// constant when the email doesn't exist (prevents user enumeration).
const DUMMY_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8e6Z6vQp1FQk5dXqXTQYqQ8eHvJTWS';

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
  return jwt.sign({ id, email }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
}

async function makeRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
  return token;
}

router.post('/register', async (req: Request, res: Response) => {
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
  const refreshToken = await makeRefreshToken(user.id);

  res.status(201).json({ accessToken, refreshToken, user });
});

router.post('/login', async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [body.email]);
  const user = result.rows[0];

  const valid = await bcrypt.compare(body.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = makeAccessToken(user.id, user.email);
  const refreshToken = await makeRefreshToken(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const tokenRow = result.rows[0];
  await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRow.id]);

  const userResult = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [tokenRow.user_id]
  );
  if (userResult.rows.length === 0) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  const user = userResult.rows[0];

  const accessToken = makeAccessToken(user.id, user.email);
  const newRefreshToken = await makeRefreshToken(user.id);

  res.json({ accessToken, refreshToken: newRefreshToken });
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  }
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
