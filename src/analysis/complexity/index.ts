/**
 * Static Analysis — Complexity Metrics
 * Calculates cyclomatic and cognitive complexity for source files.
 */

export interface ComplexityResult {
    file: string;
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    commentLines: number;
    blankLines: number;
    rating: 'low' | 'medium' | 'high' | 'critical';
}

const BRANCH_PATTERNS = [
    /\bif\b/g, /\belse\s+if\b/g, /\bfor\b/g, /\bwhile\b/g,
    /\bcase\b/g, /\bcatch\b/g, /\b\?\?/g, /\?\./g, /&&|\|\|/g,
];

export const complexityAnalyser = {
    analyse(file: string, source: string): ComplexityResult {
        const lines = source.split('\n');
        const linesOfCode = lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length;
        const commentLines = lines.filter((l) => l.trim().startsWith('//') || l.trim().startsWith('*')).length;
        const blankLines = lines.filter((l) => !l.trim()).length;

        let cyclomatic = 1;
        for (const pattern of BRANCH_PATTERNS) {
            const matches = source.match(pattern);
            cyclomatic += matches ? matches.length : 0;
        }

        // Cognitive: penalise nesting depth
        let cognitive = 0;
        let depth = 0;
        for (const line of lines) {
            const opens = (line.match(/\{/g) ?? []).length;
            const closes = (line.match(/\}/g) ?? []).length;
            if (/\b(if|for|while|switch)\b/.test(line)) cognitive += depth + 1;
            depth = Math.max(0, depth + opens - closes);
        }

        const rating =
            cyclomatic > 20 ? 'critical' :
                cyclomatic > 10 ? 'high' :
                    cyclomatic > 5 ? 'medium' : 'low';

        return { file, cyclomaticComplexity: cyclomatic, cognitiveComplexity: cognitive, linesOfCode, commentLines, blankLines, rating };
    },

    analyseMany(files: Array<{ path: string; content: string }>): ComplexityResult[] {
        return files.map((f) => this.analyse(f.path, f.content));
    },
};
