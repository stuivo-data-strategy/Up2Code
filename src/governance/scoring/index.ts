/**
 * Governance Risk Scorer
 * Aggregates findings across all governance checks into a single risk score.
 */
import type { SecurityIssue } from '@/analysis/security';

export interface RiskScore {
    score: number;     // 0-100, higher = more risk
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: { category: string; score: number; weight: number }[];
    summary: string;
}

const SEVERITY_WEIGHTS = { critical: 20, high: 10, medium: 4, low: 1, info: 0 };

export const governanceScorer = {
    calculate(securityIssues: SecurityIssue[], totalFiles: number): RiskScore {
        const rawScore = securityIssues.reduce(
            (total, issue) => total + (SEVERITY_WEIGHTS[issue.severity] ?? 0), 0
        );
        const normalised = Math.min(100, Math.round((rawScore / Math.max(totalFiles, 1)) * 10));

        const grade: RiskScore['grade'] =
            normalised < 10 ? 'A' : normalised < 25 ? 'B' : normalised < 50 ? 'C' : normalised < 75 ? 'D' : 'F';

        const criticals = securityIssues.filter(i => i.severity === 'critical').length;
        const highs = securityIssues.filter(i => i.severity === 'high').length;

        return {
            score: normalised,
            grade,
            breakdown: [
                { category: 'Security', score: normalised, weight: 0.6 },
                { category: 'Compliance', score: 0, weight: 0.2 },
                { category: 'Licensing', score: 0, weight: 0.2 },
            ],
            summary: criticals > 0
                ? `${criticals} critical issue${criticals > 1 ? 's' : ''} require immediate attention.`
                : highs > 0
                    ? `${highs} high-severity issue${highs > 1 ? 's' : ''} found — review recommended.`
                    : `No critical or high-severity issues detected.`,
        };
    },
};
