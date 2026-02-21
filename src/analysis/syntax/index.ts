/**
 * Static Analysis — Syntax Validation (stub)
 */
export interface SyntaxError { file: string; line: number; message: string; }

export const syntaxAnalyser = {
    async validate(file: string, _source: string, language: string): Promise<SyntaxError[]> {
        // TODO: hook into language-specific parsers (acorn, @typescript-eslint/parser, etc.)
        console.log(`[syntax] stub: analysing ${file} (${language})`);
        return [];
    },
};
