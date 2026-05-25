import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const [balanceResult, monthlyResult, topCatsResult, trendsResult, recentResult] =
    await Promise.all([
      pool.query(
        'SELECT COALESCE(SUM(balance), 0) AS total_balance FROM accounts WHERE user_id = $1',
        [userId]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS monthly_income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS monthly_expense
         FROM transactions
         WHERE user_id = $1 AND date >= date_trunc('month', CURRENT_DATE)`,
        [userId]
      ),
      pool.query(
        `SELECT c.name, c.color, SUM(t.amount) AS total
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1 AND t.type = 'expense'
           AND t.date >= date_trunc('month', CURRENT_DATE)
         GROUP BY c.id, c.name, c.color
         ORDER BY total DESC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT TO_CHAR(date_trunc('month', date), 'Mon YY') AS month,
                date_trunc('month', date) AS month_date,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
         FROM transactions
         WHERE user_id = $1 AND date >= NOW() - INTERVAL '6 months'
         GROUP BY date_trunc('month', date)
         ORDER BY month_date`,
        [userId]
      ),
      pool.query(
        `SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts   a ON t.account_id  = a.id
         WHERE t.user_id = $1
         ORDER BY t.date DESC, t.created_at DESC
         LIMIT 5`,
        [userId]
      ),
    ]);

  res.json({
    totalBalance: parseFloat(balanceResult.rows[0].total_balance),
    monthlyIncome: parseFloat(monthlyResult.rows[0].monthly_income),
    monthlyExpense: parseFloat(monthlyResult.rows[0].monthly_expense),
    topCategories: topCatsResult.rows,
    monthlyTrends: trendsResult.rows,
    recentTransactions: recentResult.rows,
  });
});

export default router;
