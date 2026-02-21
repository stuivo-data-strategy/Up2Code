/**
 * Governance Risk Scorer
 * Aggregates findings across all governance checks into a single risk score.
 *
 * Scoring approach:
 *   - Each issue is weighted by severity.
 *   - The raw score is normalised against the theoretical maximum
 *     (one critical issue per file = 40 pts × numFiles), so a repository
 *     with 220 low-severity issues across 30 files scores ~9/100, not 100.
 *   - Grade floors: any critical → minimum grade D; any high → minimum C.
 *     This preserves the "one severe issue = still a concern" principle.
 */

export interface RiskScore {
    score: number;     // 0–100, higher = more risk
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: { category: string; score: number; weight: number }[];
    summary: string;
    severityCounts: Record<string, number>;
}

// Points per issue severity
export const SEVERITY_WEIGHTS: Record<string, number> = {
    critical: 40,
    high:     15,
    medium:    5,
    low:       0.5,
    info:      0,
};

// Maximum points a single file can contribute (one critical)
const MAX_POINTS_PER_FILE = SEVERITY_WEIGHTS.critical; // 40

export function computeFileScore(issues: Array<{ severity: string }>): number {
    const raw = issues.reduce((t, i) => t + (SEVERITY_WEIGHTS[i.severity] ?? 0), 0);
    return Math.min(100, Math.round(raw));
}

export const governanceScorer = {
    calculate(
        securityIssues: Array<{ severity: string; file?: string }>,
        totalFiles: number,
        ignoredIssues: Set<string> = new Set()
    ): RiskScore {
        // Filter out ignored issues (caller passes a set of hashes to exclude)
        const active = securityIssues;      // filtering is handled caller-side
        void ignoredIssues;                 // kept for future API compat

        const rawScore = active.reduce(
            (total, issue) => total + (SEVERITY_WEIGHTS[issue.severity] ?? 0), 0
        );

        // Normalise: theoretical max = 40 pts × number of files scanned
        const theoreticalMax = Math.max(totalFiles, 1) * MAX_POINTS_PER_FILE;
        const normalised = Math.min(100, Math.round((rawScore / theoreticalMax) * 100));

        const criticals = active.filter(i => i.severity === 'critical').length;
        const highs     = active.filter(i => i.severity === 'high').length;
        const mediums   = active.filter(i => i.severity === 'medium').length;
        const lows      = active.filter(i => i.severity === 'low').length;
        const infos     = active.filter(i => i.severity === 'info').length;

        // Raw grade from score
        let grade: RiskScore['grade'] =
            normalised < 10 ? 'A' :
            normalised < 25 ? 'B' :
            normalised < 50 ? 'C' :
            normalised < 75 ? 'D' : 'F';

        // Grade floors — one severe issue still signals risk
        if (criticals > 0 && grade < 'D') grade = 'D';
        if (highs > 0     && grade < 'C') grade = 'C';

        return {
            score: normalised,
            grade,
            severityCounts: { critical: criticals, high: highs, medium: mediums, low: lows, info: infos },
            breakdown: [
                { category: 'Security',    score: normalised, weight: 0.6 },
                { category: 'Compliance',  score: 0,          weight: 0.2 },
                { category: 'Licensing',   score: 0,          weight: 0.2 },
            ],
            summary:
                criticals > 0
                    ? `${criticals} critical issue${criticals > 1 ? 's' : ''} require immediate attention.`
                    : highs > 0
                        ? `${highs} high-severity issue${highs > 1 ? 's' : ''} found — review recommended.`
                        : `No critical or high-severity issues detected.`,
        };
    },
};
