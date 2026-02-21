/**
 * AST Parser — extracts functions, classes, and imports from source files.
 */

export interface ASTFunction {
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    isAsync: boolean;
    isExported: boolean;
}

export interface ASTClass {
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
    isExported: boolean;
}

export interface ASTImport {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    line: number;
}

export interface ASTResult {
    file: string;
    functions: ASTFunction[];
    classes: ASTClass[];
    imports: ASTImport[];
}

const FUNC_RE = /(?:(export)\s+)?(?:(async)\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
const ARROW_RE = /(?:(export)\s+)?const\s+(\w+)\s*=\s*(?:(async)\s+)?\([^)]*\)\s*=>/g;
const CLASS_RE = /(?:(export)\s+)?class\s+(\w+)/g;
const IMPORT_RE = /import\s+(?:(.+?)\s+from\s+)?['"]([^'"]+)['"]/g;

export const astParser = {
    parse(file: string, source: string): ASTResult {
        const lines = source.split('\n');
        const functions: ASTFunction[] = [];
        const classes: ASTClass[] = [];
        const imports: ASTImport[] = [];

        let m: RegExpExecArray | null;

        FUNC_RE.lastIndex = 0;
        while ((m = FUNC_RE.exec(source)) !== null) {
            const lineNum = source.substring(0, m.index).split('\n').length;
            functions.push({
                name: m[3], startLine: lineNum, endLine: lineNum + 10,
                parameters: m[4] ? m[4].split(',').map(p => p.trim()).filter(Boolean) : [],
                isAsync: !!m[2], isExported: !!m[1],
            });
        }

        ARROW_RE.lastIndex = 0;
        while ((m = ARROW_RE.exec(source)) !== null) {
            const lineNum = source.substring(0, m.index).split('\n').length;
            functions.push({
                name: m[2], startLine: lineNum, endLine: lineNum + 5,
                parameters: [], isAsync: !!m[3], isExported: !!m[1],
            });
        }

        CLASS_RE.lastIndex = 0;
        while ((m = CLASS_RE.exec(source)) !== null) {
            const lineNum = source.substring(0, m.index).split('\n').length;
            classes.push({ name: m[2], startLine: lineNum, endLine: lineNum + 20, methods: [], isExported: !!m[1] });
        }

        IMPORT_RE.lastIndex = 0;
        while ((m = IMPORT_RE.exec(source)) !== null) {
            const lineNum = source.substring(0, m.index).split('\n').length;
            const specPart = m[1] ?? '';
            const specifiers = specPart.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            imports.push({ source: m[2], specifiers, isDefault: !specPart.includes('{'), line: lineNum });
        }

        void lines;
        return { file, functions, classes, imports };
    },
};
