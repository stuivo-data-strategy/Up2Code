/**
 * Static Analysis — Security Scanner
 * Pattern-based detection of secrets, hardcoded credentials, and vulnerabilities.
 * Each rule now includes implication and remediation guidance.
 */

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 'secret-exposure' | 'injection' | 'xss' | 'pii' | 'code-quality' | 'cryptography';

export interface SecurityIssue {
    file: string;
    line: number;
    column: number;
    rule: string;
    description: string;
    severity: Severity;
    snippet: string;
    category: RiskCategory;
    implication: string;
    remediation: string;
}

interface Rule {
    id: string;
    description: string;
    severity: Severity;
    category: RiskCategory;
    pattern: RegExp;
    implication: string;
    remediation: string;
}

const RULES: Rule[] = [
    {
        id: 'SEC001',
        description: 'Hardcoded AWS Access Key',
        severity: 'critical',
        category: 'secret-exposure',
        pattern: /AKIA[0-9A-Z]{16}/g,
        implication: 'An exposed AWS access key gives attackers programmatic access to your AWS account. They can provision infrastructure, access S3 buckets, exfiltrate data, or incur massive costs within minutes of discovery.',
        remediation: 'Remove the key from source code immediately. Rotate the key in the AWS IAM console. Store credentials in environment variables or AWS Secrets Manager. Add the key pattern to .gitignore pre-commit hooks.',
    },
    {
        id: 'SEC002',
        description: 'Hardcoded password assignment',
        severity: 'high',
        category: 'secret-exposure',
        pattern: /password\s*=\s*["'][^"']{4,}["']/gi,
        implication: 'Hardcoded passwords in source code are permanently recorded in git history. Once the repository is accessed (publicly or via a breach), attackers can use the credential to access databases, admin panels, or third-party services.',
        remediation: 'Move all passwords to environment variables (process.env.PASSWORD). Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, or Doppler) in production. Run `git filter-branch` or BFG Repo Cleaner to purge from history.',
    },
    {
        id: 'SEC003',
        description: 'Hardcoded API key',
        severity: 'high',
        category: 'secret-exposure',
        pattern: /api[_-]?key\s*[:=]\s*["'][^"']{8,}["']/gi,
        implication: 'API keys committed to source control can be harvested by automated scanners (e.g. TruffleHog, GitHub secret scanning). Compromised keys allow attackers to impersonate your application and consume API quota or access sensitive data.',
        remediation: 'Revoke and regenerate the API key immediately. Store in .env.local (and ensure .env.local is in .gitignore). Use platform secret injection in CI/CD pipelines.',
    },
    {
        id: 'SEC004',
        description: 'Hardcoded secret value',
        severity: 'high',
        category: 'secret-exposure',
        pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/gi,
        implication: 'Secrets in plaintext source code are trivially discoverable through code review, repository access, or automated scanning tools. Any secret used for signing (JWTs, webhooks) becomes invalid as a security control.',
        remediation: 'Replace with environment variable references. For JWT secrets, use a cryptographically secure random string of at least 32 characters, stored in a secrets manager.',
    },
    {
        id: 'SEC005',
        description: 'Hardcoded token',
        severity: 'high',
        category: 'secret-exposure',
        pattern: /token\s*[:=]\s*["'][^"']{8,}["']/gi,
        implication: 'Tokens (OAuth, session, bearer) in source code expose authentication mechanisms. An attacker can use a stolen token to impersonate users or services without needing credentials.',
        remediation: 'Never commit tokens. Use short-lived tokens with refresh mechanisms. Store in secure environment configuration, not in code.',
    },
    {
        id: 'SEC006',
        description: 'Private key material in source',
        severity: 'critical',
        category: 'cryptography',
        pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
        implication: 'A private key in source control completely compromises your PKI trust chain. Attackers can decrypt TLS traffic, forge signatures, or impersonate your server. This is a critical incident-level finding.',
        remediation: 'Treat this as a security incident. Revoke the certificate/key pair immediately. Issue a new key pair and store it in a hardware security module (HSM) or secrets manager. Audit all systems that trusted this key.',
    },
    {
        id: 'SEC007',
        description: 'eval() usage — code injection risk',
        severity: 'medium',
        category: 'injection',
        pattern: /\beval\s*\(/g,
        implication: 'eval() executes arbitrary strings as code. If any part of the evaluated string is user-controlled, attackers can execute arbitrary JavaScript in your application context — a critical code injection vulnerability.',
        remediation: 'Replace eval() with safer alternatives: JSON.parse() for data, Function constructor for dynamic code (with strict input validation), or restructure logic to avoid dynamic evaluation entirely.',
    },
    {
        id: 'SEC008',
        description: 'dangerouslySetInnerHTML — XSS risk',
        severity: 'medium',
        category: 'xss',
        pattern: /dangerouslySetInnerHTML/g,
        implication: 'dangerouslySetInnerHTML bypasses React\'s XSS protections. If the HTML content comes from user input or an untrusted source, attackers can inject malicious scripts that run in users\' browsers, stealing session tokens, redirecting users, or exfiltrating data.',
        remediation: 'Sanitize HTML content with DOMPurify before passing it in. Where possible, render data as text (children prop) rather than raw HTML. Perform a security review of every usage site.',
    },
    {
        id: 'SEC009',
        description: 'SQL string concatenation — injection risk',
        severity: 'high',
        category: 'injection',
        pattern: /["'`]\s*SELECT .+ \+\s*/gi,
        implication: 'String-concatenated SQL queries are vulnerable to SQL injection — one of the most prevalent attack vectors. Attackers can bypass authentication, exfiltrate entire databases, or execute destructive commands (DROP TABLE).',
        remediation: 'Always use parameterised queries or prepared statements. For ORMs, use the query builder API. Never interpolate user input directly into SQL strings.',
    },
    {
        id: 'SEC010',
        description: 'console.log with potential PII',
        severity: 'low',
        category: 'pii',
        pattern: /console\.(log|debug)\s*\([^)]*\b(password|email|token|ssn|credit)\b/gi,
        implication: 'Logging sensitive fields (passwords, emails, tokens) risks exposing PII in server logs, browser DevTools, or log aggregation systems. This may constitute a GDPR Article 32 violation (inadequate security measures for personal data).',
        remediation: 'Remove or redact sensitive fields before logging. Use a structured logger with field-level redaction (e.g. pino redact). Implement a log review process and log retention policy compliant with your data classification policy.',
    },
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
                        category: rule.category,
                        implication: rule.implication,
                        remediation: rule.remediation,
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
        const byCategory = issues.reduce((acc, i) => {
            acc[i.category] = (acc[i.category] ?? 0) + 1;
            return acc;
        }, {} as Record<RiskCategory, number>);
        return { total: issues.length, bySeverity, byCategory };
    },
};
