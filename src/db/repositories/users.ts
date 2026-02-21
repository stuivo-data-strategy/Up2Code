/**
 * Users Repository — CRUD for the `users` table.
 */
import { sql } from '@/db/client';

export interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

const DEMO_USER_EMAIL = 'demo@up2code.dev';
const DEMO_USER_NAME = 'Demo User';

export const userRepo = {
    async findByEmail(email: string): Promise<User | null> {
        const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        return (rows[0] as User) ?? null;
    },

    async findById(id: string): Promise<User | null> {
        const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
        return (rows[0] as User) ?? null;
    },

    async create(email: string, name?: string): Promise<User> {
        const rows = await sql`
      INSERT INTO users (email, name)
      VALUES (${email}, ${name ?? null})
      RETURNING *
    `;
        return rows[0] as User;
    },

    /**
     * Returns the demo user, creating it if it doesn't exist.
     * Used so the app works without auth configured.
     */
    async getOrCreateDemoUser(): Promise<User> {
        const existing = await this.findByEmail(DEMO_USER_EMAIL);
        if (existing) return existing;
        return this.create(DEMO_USER_EMAIL, DEMO_USER_NAME);
    },
};
