import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const budgetSchema = z.object({
  category_id: z.number().int().positive(),
  amount: z.number().positive(),
  period: z.enum(['monthly', 'weekly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function categoryBelongsToUser(categoryId: number, userId: number): Promise<boolean> {
  const r = await pool.query(
    'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );
  return r.rows.length > 0;
}

/**
 * "spent" honors the budget's period and start_date:
 *
 *   - weekly  → spend since the most recent Monday OR start_date, whichever is later
 *   - monthly → spend since the 1st of the month OR start_date, whichever is later
 *
 * GREATEST(start_date, period_start) means a budget created mid-period only
 * counts transactions on/after its start, not the whole period.
 */
const SPENT_EXPR = `
  COALESCE((
    SELECT SUM(t.amount)
    FROM transactions t
    WHERE t.category_id = b.category_id
      AND t.user_id     = b.user_id
      AND t.type        = 'expense'
      AND t.date >= GREATEST(
        b.start_date,
        CASE WHEN b.period = 'weekly'
             THEN date_trunc('week',  CURRENT_DATE)::date
             ELSE date_trunc('month', CURRENT_DATE)::date
        END
      )
  ), 0) AS spent
`;

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT b.*, c.name AS category_name, c.color AS category_color,
            ${SPENT_EXPR}
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = $1
     ORDER BY b.start_date DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const body = budgetSchema.parse(req.body);

  if (!(await categoryBelongsToUser(body.category_id, req.user!.id))) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const result = await pool.query(
    'INSERT INTO budgets (user_id, category_id, amount, period, start_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user!.id, body.category_id, body.amount, body.period, body.start_date]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const body = budgetSchema.parse(req.body);

  if (!(await categoryBelongsToUser(body.category_id, req.user!.id))) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const result = await pool.query(
    'UPDATE budgets SET category_id=$1, amount=$2, period=$3, start_date=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
    [body.category_id, body.amount, body.period, body.start_date, id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Budget not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const result = await pool.query(
    'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Budget not found' });
    return;
  }
  res.status(204).send();
});

export default router;
