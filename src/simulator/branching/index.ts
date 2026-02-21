/**
 * Simulator Branching — branch prediction and condition classification.
 */
export interface Branch { line: number; condition: string; likelyOutcome: 'true' | 'false' | 'unknown'; impact: 'low' | 'medium' | 'high'; }

const FALSISH = /null|undefined|false|0|""|''|``/;
const TRUTHISH = /true|[1-9]\d*|"[^"]+"|'[^']+'/;

export const branchPredictor = {
    predict(line: number, condition: string): Branch {
        let likelyOutcome: Branch['likelyOutcome'] = 'unknown';
        if (FALSISH.test(condition)) likelyOutcome = 'false';
        else if (TRUTHISH.test(condition)) likelyOutcome = 'true';

        const impact = condition.includes('&&') || condition.includes('||') ? 'high' :
            condition.includes('!') ? 'medium' : 'low';

        return { line, condition, likelyOutcome, impact };
    },

    extractBranches(source: string): Branch[] {
        const branches: Branch[] = [];
        const re = /\bif\s*\((.+?)\)/g;
        const lines = source.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let m: RegExpExecArray | null;
            re.lastIndex = 0;
            while ((m = re.exec(lines[i])) !== null) {
                branches.push(this.predict(i + 1, m[1]));
            }
        }
        return branches;
    },
};
