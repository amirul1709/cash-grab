import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().max(50).default('tag'),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name',
    [req.user!.id]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const body = categorySchema.parse(req.body);
  const result = await pool.query(
    'INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user!.id, body.name, body.type, body.color, body.icon]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const body = categorySchema.parse(req.body);
  const result = await pool.query(
    'UPDATE categories SET name=$1, type=$2, color=$3, icon=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
    [body.name, body.type, body.color, body.icon, req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.status(204).send();
});

export default router;
