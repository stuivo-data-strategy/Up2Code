/**
 * Neon DB Client — serverless PostgreSQL connection singleton.
 * Set DATABASE_URL in .env.local to your Neon connection string.
 */
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('[db] DATABASE_URL is not set — database queries will fail.');
}

// `neon()` returns a tagged template sql function.
// Use: const rows = await sql`SELECT * FROM users WHERE id = ${id}`
export const sql = neon(connectionString ?? '');

export type NeonSql = typeof sql;
