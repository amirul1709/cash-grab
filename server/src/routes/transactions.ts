import { Router, Response } from 'express';
import { z } from 'zod';
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

const TRANSACTION_SELECT = `
  SELECT t.*,
         c.name  AS category_name,
         c.color AS category_color,
         a.name  AS account_name
  FROM   transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts   a ON t.account_id  = a.id
`;

router.get('/', async (req: AuthRequest, res: Response) => {
  const { account_id, category_id, from, to, page = '1', limit = '20' } = req.query;

  const conditions: string[] = ['t.user_id = $1'];
  const values: unknown[] = [req.user!.id];
  let p = 2;

  if (account_id) { conditions.push(`t.account_id = $${p++}`);  values.push(account_id); }
  if (category_id) { conditions.push(`t.category_id = $${p++}`); values.push(category_id); }
  if (from) { conditions.push(`t.date >= $${p++}`); values.push(from); }
  if (to)   { conditions.push(`t.date <= $${p++}`); values.push(to); }

  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, parseInt(limit as string) || 20);
  const offset   = (pageNum - 1) * limitNum;
  const where    = conditions.join(' AND ');

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, values),
    pool.query(
      `${TRANSACTION_SELECT} WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...values, limitNum, offset]
    ),
  ]);

  res.json({
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page: pageNum,
    limit: limitNum,
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const body = transactionSchema.parse(req.body);

  const accountCheck = await pool.query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
    [body.account_id, req.user!.id]
  );
  if (accountCheck.rows.length === 0) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txResult = await client.query(
      'INSERT INTO transactions (user_id, account_id, category_id, amount, type, description, date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user!.id, body.account_id, body.category_id ?? null, body.amount, body.type, body.description ?? null, body.date]
    );

    const delta = body.type === 'income' ? body.amount : -body.amount;
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, body.account_id]);

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
  const result = await pool.query(
    `${TRANSACTION_SELECT} WHERE t.id = $1 AND t.user_id = $2`,
    [req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const body = transactionSchema.parse(req.body);

  const existing = await pool.query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  const old = existing.rows[0];

  if (body.account_id !== old.account_id) {
    const accountCheck = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [body.account_id, req.user!.id]
    );
    if (accountCheck.rows.length === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reverse old transaction's effect on old account
    const oldDelta = old.type === 'income' ? -parseFloat(old.amount) : parseFloat(old.amount);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [oldDelta, old.account_id]);

    // Apply new transaction's effect on new account
    const newDelta = body.type === 'income' ? body.amount : -body.amount;
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [newDelta, body.account_id]);

    const result = await client.query(
      `UPDATE transactions
       SET account_id=$1, category_id=$2, amount=$3, type=$4, description=$5, date=$6
       WHERE id=$7 AND user_id=$8
       RETURNING *`,
      [body.account_id, body.category_id ?? null, body.amount, body.type, body.description ?? null, body.date, req.params.id, req.user!.id]
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
  const existing = await pool.query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  const tx = existing.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM transactions WHERE id = $1', [tx.id]);

    const delta = tx.type === 'income' ? -parseFloat(tx.amount) : parseFloat(tx.amount);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, tx.account_id]);

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
