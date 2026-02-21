/**
 * Files Repository — CRUD for the `files` table.
 */
import { sql } from '@/db/client';

export interface RepoFile {
    id: string;
    repository_id: string;
    path: string;
    extension: string | null;
    size_bytes: number;
    lines_of_code: number;
    language: string | null;
    content_hash: string | null;
    created_at: string;
    updated_at: string;
}

export const filesRepo = {
    async findByRepository(repositoryId: string): Promise<RepoFile[]> {
        const rows = await sql`
      SELECT * FROM files WHERE repository_id = ${repositoryId} ORDER BY path
    `;
        return rows as RepoFile[];
    },

    async upsert(data: {
        repository_id: string;
        path: string;
        extension?: string;
        size_bytes?: number;
        lines_of_code?: number;
        language?: string;
        content_hash?: string;
    }): Promise<RepoFile> {
        const rows = await sql`
      INSERT INTO files (repository_id, path, extension, size_bytes, lines_of_code, language, content_hash)
      VALUES (
        ${data.repository_id},
        ${data.path},
        ${data.extension ?? null},
        ${data.size_bytes ?? 0},
        ${data.lines_of_code ?? 0},
        ${data.language ?? null},
        ${data.content_hash ?? null}
      )
      ON CONFLICT (repository_id, path)
      DO UPDATE SET
        size_bytes = EXCLUDED.size_bytes,
        lines_of_code = EXCLUDED.lines_of_code,
        language = EXCLUDED.language,
        content_hash = EXCLUDED.content_hash,
        updated_at = NOW()
      RETURNING *
    `;
        return rows[0] as RepoFile;
    },

    async countByRepository(repositoryId: string): Promise<number> {
        const rows = await sql`SELECT COUNT(*)::int AS count FROM files WHERE repository_id = ${repositoryId}`;
        return (rows[0] as { count: number }).count;
    },
};
