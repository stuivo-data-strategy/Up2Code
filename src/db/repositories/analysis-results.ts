/**
 * Analysis Results Repository — aligned to the real schema in 001_initial.sql
 *
 * Table: analysis_results
 *   id, repository_id, file_id, type, status, results (JSONB), summary (JSONB),
 *   cyclomatic_complexity, cognitive_complexity, issue_count, created_at, updated_at
 */
import { sql } from '@/db/client';

export type AnalysisType = 'security' | 'complexity' | 'refactor' | 'syntax' | 'linting';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AnalysisIssue {
    ruleId: string;
    description: string;
    file: string;
    line?: number;
    severity: Severity;
    category?: string;
    match?: string;
}

export interface AnalysisResult {
    id: string;
    repository_id: string;
    file_id: string | null;
    type: AnalysisType;           // DB column is "type"
    status: 'pending' | 'running' | 'complete' | 'failed';
    results: AnalysisIssue[];     // DB column is "results" (JSONB)
    summary: Record<string, unknown>;
    cyclomatic_complexity: number | null;
    cognitive_complexity: number | null;
    issue_count: number;
    created_at: string;
    updated_at: string;
}

export const analysisResultsRepo = {
    async findByRepository(
        repositoryId: string,
        type?: AnalysisType
    ): Promise<AnalysisResult[]> {
        if (type) {
            const rows = await sql`
        SELECT * FROM analysis_results
        WHERE repository_id = ${repositoryId} AND type = ${type}
        ORDER BY created_at DESC
      `;
            return rows as AnalysisResult[];
        }
        const rows = await sql`
      SELECT * FROM analysis_results
      WHERE repository_id = ${repositoryId}
      ORDER BY created_at DESC
    `;
        return rows as AnalysisResult[];
    },

    async upsertForRepo(data: {
        repository_id: string;
        type: AnalysisType;
        issues: AnalysisIssue[];
        summary: Record<string, unknown>;
        duration_ms: number;
    }): Promise<AnalysisResult> {
        const rows = await sql`
      INSERT INTO analysis_results
        (repository_id, type, status, results, summary, issue_count)
      VALUES (
        ${data.repository_id},
        ${data.type},
        'complete',
        ${JSON.stringify(data.issues)},
        ${JSON.stringify({ ...data.summary, duration_ms: data.duration_ms })},
        ${data.issues.length}
      )
      RETURNING *
    `;
        return rows[0] as AnalysisResult;
    },
};
