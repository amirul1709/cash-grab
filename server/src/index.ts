import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { z } from 'zod';
import { runMigrations } from './db/migrate';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import budgetsRouter from './routes/budgets';
import dashboardRouter from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';
import { csrfGuard } from './middleware/csrf';

dotenv.config();

// Fail fast at boot if required secrets are missing — otherwise jwt.sign()
// would silently sign tokens with the string "undefined", which is forgeable.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.string().regex(/^\d+$/).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.error('Invalid environment configuration:');
  for (const issue of envResult.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}
const env = envResult.data;

const app = express();
const PORT = parseInt(env.PORT, 10);

// Required if deployed behind a reverse proxy (Railway/Render/Heroku/etc.)
// so req.ip reflects the real client and rate limiting keys correctly.
app.set('trust proxy', 1);

if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) return res.redirect(301, `https://${req.headers.host}${req.url}`);
    next();
  });
}

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Require a custom header on all state-changing requests (CSRF defense).
// Runs after CORS so legitimate preflights are handled first.
app.use(csrfGuard);

app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(errorHandler);

async function start() {
  await runMigrations();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
