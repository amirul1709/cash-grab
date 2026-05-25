import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import budgetsRouter from './routes/budgets';
import dashboardRouter from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

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

start().catch(console.error);
