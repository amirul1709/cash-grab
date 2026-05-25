import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash']),
  balance: z.number().default(0),
  currency: z.string().length(3).default('USD'),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at',
    [req.user!.id]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const body = accountSchema.parse(req.body);
  const result = await pool.query(
    'INSERT INTO accounts (user_id, name, type, balance, currency) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user!.id, body.name, body.type, body.balance, body.currency]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const body = accountSchema.partial().parse(req.body);

  const existing = await pool.query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const fields = Object.entries(body).filter(([, v]) => v !== undefined);
  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const setClauses = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = fields.map(([, v]) => v);

  const result = await pool.query(
    `UPDATE accounts SET ${setClauses} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
    [...values, req.params.id, req.user!.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.status(204).send();
});

export default router;
