import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/**
 * Runs every *.sql file in /server/migrations in alphabetical order.
 * Files are expected to be idempotent (use IF NOT EXISTS / IF EXISTS / safe
 * upserts) so re-running on a populated DB is a no-op.
 *
 * Each file is wrapped in its own transaction so a partial failure rolls back
 * cleanly instead of leaving the schema half-applied.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }
}
