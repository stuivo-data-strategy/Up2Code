/**
 * Governance Compliance stub — GDPR/regulatory checks.
 */
export interface ComplianceIssue { file: string; line: number; rule: string; description: string; }

const PII_PATTERNS: Array<{ rule: string; description: string; pattern: RegExp }> = [
    { rule: 'GDPR001', description: 'Potential email address stored in plaintext', pattern: /["'][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}["']/g },
    { rule: 'GDPR002', description: 'Potential credit card number pattern', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
    { rule: 'GDPR003', description: 'National ID / SSN-like pattern', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
];

export const complianceChecker = {
    check(file: string, source: string): ComplianceIssue[] {
        const issues: ComplianceIssue[] = [];
        const lines = source.split('\n');
        for (const { rule, description, pattern } of PII_PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
                pattern.lastIndex = 0;
                if (pattern.test(lines[i])) issues.push({ file, line: i + 1, rule, description });
            }
        }
        return issues;
    },
};
