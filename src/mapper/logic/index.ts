/**
 * Logic Mapper — extracts control-flow paths from source.
 */
export interface LogicBlock { type: 'if' | 'loop' | 'switch' | 'try' | 'return'; line: number; condition?: string; }
export interface LogicMap { file: string; blocks: LogicBlock[]; }

const CONTROL_RE = /^\s*(if|for|while|switch|try|return)\b(.{0,60})/;

export const logicMapper = {
    map(file: string, source: string): LogicMap {
        const blocks: LogicBlock[] = [];
        const lines = source.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const m = CONTROL_RE.exec(lines[i]);
            if (m) {
                blocks.push({ type: m[1] as LogicBlock['type'], line: i + 1, condition: m[2]?.trim() });
            }
        }
        return { file, blocks };
    },
};
