/**
 * Data-Flow Mapper — stub
 * Traces variable assignments and data transformations through source files.
 */
export interface DataFlowNode { name: string; type: 'assignment' | 'parameter' | 'return'; line: number; file: string; }
export interface DataFlowTrace { variable: string; nodes: DataFlowNode[]; }

export const dataflowMapper = {
    trace(file: string, source: string): DataFlowTrace[] {
        const traces: DataFlowTrace[] = [];
        const lines = source.split('\n');
        const assignRe = /(?:const|let|var)\s+(\w+)\s*=/g;
        for (let i = 0; i < lines.length; i++) {
            let m: RegExpExecArray | null;
            assignRe.lastIndex = 0;
            while ((m = assignRe.exec(lines[i])) !== null) {
                traces.push({ variable: m[1], nodes: [{ name: m[1], type: 'assignment', line: i + 1, file }] });
            }
        }
        return traces;
    },
};
