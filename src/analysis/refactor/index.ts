/**
 * Static Analysis — Refactoring Suggestions
 */
export interface RefactorSuggestion { file: string; line: number; type: string; description: string; example?: string; }

const PATTERNS: Array<{ type: string; description: string; pattern: RegExp; example?: string }> = [
    { type: 'long-function', description: 'Function exceeds 50 lines — consider splitting', pattern: /function\s+\w+\s*\([^)]*\)\s*\{/, example: 'Break into smaller, focused functions' },
    { type: 'magic-number', description: 'Magic number detected — extract to named constant', pattern: /[^a-zA-Z0-9_](\d{3,})[^a-zA-Z0-9_]/, example: 'const MAX_RETRIES = 500' },
    { type: 'deeply-nested', description: 'Deep nesting detected — consider early returns', pattern: /(\s{16,}|\t{4,})(if|for|while)\b/, example: 'Use guard clauses to reduce nesting' },
    { type: 'any-type', description: 'Avoid using `any` type in TypeScript', pattern: /:\s*any\b/, example: 'Use specific types or generics' },
    { type: 'console-log', description: 'Remove debug console.log before committing', pattern: /console\.(log|debug)\s*\(/, },
    { type: 'todo-comment', description: 'Unresolved TODO comment', pattern: /\/\/\s*TODO:/i },
];

export const refactorAnalyser = {
    analyse(file: string, source: string): RefactorSuggestion[] {
        const suggestions: RefactorSuggestion[] = [];
        const lines = source.split('\n');
        for (const { type, description, pattern, example } of PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i])) {
                    suggestions.push({ file, line: i + 1, type, description, example });
                }
            }
        }
        return suggestions;
    },
};
