/**
 * Simulator State — variable snapshot store per execution step.
 */
export interface VariableState { name: string; value: unknown; type: string; changedAtStep: number; }
export interface StepSnapshot { stepIndex: number; variables: VariableState[]; callStack: string[]; }

export class SimulatorStateStore {
    private snapshots: Map<number, StepSnapshot> = new Map();

    set(stepIndex: number, variables: VariableState[], callStack: string[]) {
        this.snapshots.set(stepIndex, { stepIndex, variables, callStack });
    }

    get(stepIndex: number): StepSnapshot | undefined {
        return this.snapshots.get(stepIndex);
    }

    getChangedSince(from: number, to: number): VariableState[] {
        const snapshot = this.snapshots.get(to);
        if (!snapshot) return [];
        return snapshot.variables.filter((v) => v.changedAtStep > from);
    }

    clear() { this.snapshots.clear(); }
}
