/**
 * Repository Repository — CRUD operations for the `repositories` table.
 */
import { sql } from '@/db/client';

export interface Repository {
    id: string;
    user_id: string;
    name: string;
    full_name: string | null;
    description: string | null;
    source: string;
    source_url: string | null;
    primary_language: string | null;
    frameworks: string[];
    total_files: number;
    risk_score: number;
    risk_grade: string;
    metadata: Record<string, unknown>;
    last_analysed_at: string | null;
    created_at: string;
    updated_at: string;
}

export const repositoryRepo = {
    async findAll(userId: string): Promise<Repository[]> {
        const rows = await sql`SELECT * FROM repositories WHERE user_id = ${userId} ORDER BY updated_at DESC`;
        return rows as Repository[];
    },

    async findById(id: string): Promise<Repository | null> {
        const rows = await sql`SELECT * FROM repositories WHERE id = ${id} LIMIT 1`;
        return (rows[0] as Repository) ?? null;
    },

    async create(data: Omit<Repository, 'id' | 'created_at' | 'updated_at'>): Promise<Repository> {
        const rows = await sql`
      INSERT INTO repositories (user_id, name, full_name, description, source, source_url, primary_language, frameworks, total_files, risk_score, risk_grade, metadata)
      VALUES (${data.user_id}, ${data.name}, ${data.full_name}, ${data.description}, ${data.source}, ${data.source_url}, ${data.primary_language}, ${data.frameworks}, ${data.total_files}, ${data.risk_score}, ${data.risk_grade}, ${JSON.stringify(data.metadata)})
      RETURNING *
    `;
        return rows[0] as Repository;
    },

    async updateRiskScore(id: string, score: number, grade: string): Promise<void> {
        await sql`UPDATE repositories SET risk_score = ${score}, risk_grade = ${grade}, updated_at = NOW() WHERE id = ${id}`;
    },

    async updateMetadata(id: string, data: {
        primary_language?: string | null;
        frameworks?: string[];
        total_files?: number;
        last_analysed_at?: string | null;
    }): Promise<Repository> {
        const rows = await sql`
            UPDATE repositories SET
                primary_language = COALESCE(${data.primary_language ?? null}, primary_language),
                frameworks       = COALESCE(${data.frameworks ?? null}, frameworks),
                total_files      = COALESCE(${data.total_files ?? null}, total_files),
                last_analysed_at = COALESCE(${data.last_analysed_at ?? null}, last_analysed_at),
                updated_at       = NOW()
            WHERE id = ${id}
            RETURNING *
        `;
        return rows[0] as Repository;
    },

    async delete(id: string): Promise<void> {
        await sql`DELETE FROM repositories WHERE id = ${id}`;
    },
};
