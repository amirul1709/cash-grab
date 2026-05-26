import { Router, Response } from 'express';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const transactionSchema = z.object({
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive().nullable().optional(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const listQuerySchema = z.object({
  account_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const TRANSACTION_SELECT = `
  SELECT t.*,
         c.name  AS category_name,
         c.color AS category_color,
         a.name  AS account_name
  FROM   transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts   a ON t.account_id  = a.id
`;

/**
 * Locks the account row and verifies it belongs to `userId`. Returns the
 * account id on success or null when missing — caller decides whether to 404.
 * Must be called inside a transaction (uses FOR UPDATE).
 */
async function lockOwnedAccount(
  client: PoolClient,
  accountId: number,
  userId: number
): Promise<boolean> {
  const r = await client.query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
    [accountId, userId]
  );
  return r.rows.length > 0;
}

/**
 * Confirms the category (if given) belongs to `userId`. Returns true when the
 * category is absent (null/undefined) — callers can pass through. Returns
 * false only when a category was named but doesn't belong to the user.
 */
async function categoryOwnedOrAbsent(
  client: PoolClient,
  categoryId: number | null | undefined,
  userId: number
): Promise<boolean> {
  if (categoryId === null || categoryId === undefined) return true;
  const r = await client.query(
    'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );
  return r.rows.length > 0;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const params = listQuerySchema.parse(req.query);

  const conditions: string[] = ['t.user_id = $1'];
  const values: unknown[] = [req.user!.id];
  let p = 2;

  if (params.account_id)  { conditions.push(`t.account_id  = $${p++}`); values.push(params.account_id); }
  if (params.category_id) { conditions.push(`t.category_id = $${p++}`); values.push(params.category_id); }
  if (params.from)        { conditions.push(`t.date >= $${p++}`);        values.push(params.from); }
  if (params.to)          { conditions.push(`t.date <= $${p++}`);        values.push(params.to); }

  const offset = (params.page - 1) * params.limit;
  const where  = conditions.join(' AND ');

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, values),
    pool.query(
      `${TRANSACTION_SELECT} WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...values, params.limit, offset]
    ),
  ]);

  res.json({
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page: params.page,
    limit: params.limit,
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const body = transactionSchema.parse(req.body);
  const userId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!(await lockOwnedAccount(client, body.account_id, userId))) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (!(await categoryOwnedOrAbsent(client, body.category_id, userId))) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const txResult = await client.query(
      `INSERT INTO transactions
         (user_id, account_id, category_id, amount, type, description, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [userId, body.account_id, body.category_id ?? null, body.amount, body.type, body.description ?? null, body.date]
    );

    // SQL-only balance update: no JS float round-trip.
    await client.query(
      `UPDATE accounts
       SET balance = balance + (CASE WHEN $1 = 'income' THEN $2::numeric ELSE -$2::numeric END)
       WHERE id = $3`,
      [body.type, body.amount, body.account_id]
    );

    await client.query('COMMIT');
    res.status(201).json(txResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const result = await pool.query(
    `${TRANSACTION_SELECT} WHERE t.id = $1 AND t.user_id = $2`,
    [id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const body = transactionSchema.parse(req.body);
  const userId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the existing transaction so we can read its old amount/type
    // and atomically reverse its effect.
    const existing = await client.query(
      'SELECT id, account_id, category_id, amount, type FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [id, userId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    const old = existing.rows[0];

    // Lock target accounts (old and new). Locking both regardless of whether
    // they changed keeps the math safe under concurrency.
    if (!(await lockOwnedAccount(client, old.account_id, userId))) {
      // The original account was deleted — treat as missing.
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Original account no longer exists' });
      return;
    }
    if (body.account_id !== old.account_id) {
      if (!(await lockOwnedAccount(client, body.account_id, userId))) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    if (!(await categoryOwnedOrAbsent(client, body.category_id, userId))) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Reverse the old effect on the old account.
    await client.query(
      `UPDATE accounts
       SET balance = balance - (CASE WHEN $1 = 'income' THEN $2::numeric ELSE -$2::numeric END)
       WHERE id = $3`,
      [old.type, old.amount, old.account_id]
    );

    // Apply the new effect on the new account.
    await client.query(
      `UPDATE accounts
       SET balance = balance + (CASE WHEN $1 = 'income' THEN $2::numeric ELSE -$2::numeric END)
       WHERE id = $3`,
      [body.type, body.amount, body.account_id]
    );

    const result = await client.query(
      `UPDATE transactions
       SET account_id=$1, category_id=$2, amount=$3, type=$4, description=$5, date=$6
       WHERE id=$7 AND user_id=$8
       RETURNING *`,
      [body.account_id, body.category_id ?? null, body.amount, body.type, body.description ?? null, body.date, id, userId]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const userId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const deleted = await client.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING account_id, amount, type`,
      [id, userId]
    );
    if (deleted.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    const tx = deleted.rows[0];

    await client.query(
      `UPDATE accounts
       SET balance = balance - (CASE WHEN $1 = 'income' THEN $2::numeric ELSE -$2::numeric END)
       WHERE id = $3`,
      [tx.type, tx.amount, tx.account_id]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
