/**
 * Static Analysis — Linting (stub)
 */
export interface LintIssue { file: string; line: number; rule: string; message: string; severity: 'warn' | 'error'; }

export const lintAnalyser = {
    async lint(file: string, _source: string): Promise<LintIssue[]> {
        // TODO: integrate ESLint programmatic API
        console.log(`[lint] stub: linting ${file}`);
        return [];
    },
};
