/**
 * Static Analysis — Security Scanner
 * Pattern-based detection of secrets, hardcoded credentials, and vulnerabilities.
 */

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityIssue {
    file: string;
    line: number;
    column: number;
    rule: string;
    description: string;
    severity: Severity;
    snippet: string;
}

interface Rule {
    id: string;
    description: string;
    severity: Severity;
    pattern: RegExp;
}

const RULES: Rule[] = [
    { id: 'SEC001', description: 'Hardcoded AWS Access Key', severity: 'critical', pattern: /AKIA[0-9A-Z]{16}/g },
    { id: 'SEC002', description: 'Hardcoded password assignment', severity: 'high', pattern: /password\s*=\s*["'][^"']{4,}["']/gi },
    { id: 'SEC003', description: 'Hardcoded API key', severity: 'high', pattern: /api[_-]?key\s*[:=]\s*["'][^"']{8,}["']/gi },
    { id: 'SEC004', description: 'Hardcoded secret', severity: 'high', pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/gi },
    { id: 'SEC005', description: 'Hardcoded token', severity: 'high', pattern: /token\s*[:=]\s*["'][^"']{8,}["']/gi },
    { id: 'SEC006', description: 'Private key material', severity: 'critical', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { id: 'SEC007', description: 'eval() usage (code injection risk)', severity: 'medium', pattern: /\beval\s*\(/g },
    { id: 'SEC008', description: 'dangerouslySetInnerHTML usage', severity: 'medium', pattern: /dangerouslySetInnerHTML/g },
    { id: 'SEC009', description: 'SQL string concatenation (injection risk)', severity: 'high', pattern: /["'`]\s*SELECT .+ \+\s*/gi },
    { id: 'SEC010', description: 'console.log with potential PII', severity: 'low', pattern: /console\.(log|debug)\s*\([^)]*\b(password|email|token|ssn|credit)\b/gi },
];

export const securityScanner = {
    scan(file: string, source: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = source.split('\n');

        for (const rule of RULES) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let match: RegExpExecArray | null;
                rule.pattern.lastIndex = 0;
                while ((match = rule.pattern.exec(line)) !== null) {
                    issues.push({
                        file,
                        line: i + 1,
                        column: match.index + 1,
                        rule: rule.id,
                        description: rule.description,
                        severity: rule.severity,
                        snippet: line.trim().substring(0, 120),
                    });
                }
            }
        }

        return issues;
    },

    scanMany(files: Array<{ path: string; content: string }>): SecurityIssue[] {
        return files.flatMap((f) => this.scan(f.path, f.content));
    },

    summarise(issues: SecurityIssue[]) {
        const bySeverity = issues.reduce((acc, i) => {
            acc[i.severity] = (acc[i.severity] ?? 0) + 1;
            return acc;
        }, {} as Record<Severity, number>);
        return { total: issues.length, bySeverity };
    },
};
