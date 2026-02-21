/**
 * Execution Simulator — F8 Engine
 * Step-through execution state machine for simulating code without running it.
 */

export type StepType = 'function-call' | 'assignment' | 'branch' | 'loop' | 'return' | 'expression';

export interface ExecutionStep {
    id: string;
    stepIndex: number;
    type: StepType;
    file: string;
    line: number;
    description: string;
    variables: Record<string, unknown>;
    callStack: string[];
}

export interface SimulationSession {
    id: string;
    repositoryId: string;
    entryPoint: string;
    steps: ExecutionStep[];
    currentStepIndex: number;
    status: 'idle' | 'playing' | 'paused' | 'complete';
}

export const simulatorEngine = {
    createSession(repositoryId: string, entryPoint: string): SimulationSession {
        return {
            id: crypto.randomUUID(),
            repositoryId,
            entryPoint,
            steps: [],
            currentStepIndex: -1,
            status: 'idle',
        };
    },

    generateSteps(file: string, source: string): ExecutionStep[] {
        const lines = source.split('\n');
        const steps: ExecutionStep[] = [];
        let stepIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('//')) continue;

            let type: StepType = 'expression';
            let description = line.substring(0, 80);

            if (/\bfunction\b|\bconst\s+\w+\s*=\s*(async\s+)?\(/.test(line)) {
                type = 'function-call';
                description = `Enter function: ${line.substring(0, 60)}`;
            } else if (/\b(const|let|var)\s+\w+\s*=/.test(line)) {
                type = 'assignment';
                description = `Assign: ${line.substring(0, 60)}`;
            } else if (/^\s*(if|else)\b/.test(line)) {
                type = 'branch';
                description = `Branch: ${line.substring(0, 60)}`;
            } else if (/^\s*(for|while)\b/.test(line)) {
                type = 'loop';
                description = `Loop: ${line.substring(0, 60)}`;
            } else if (/^\s*return\b/.test(line)) {
                type = 'return';
                description = `Return: ${line.substring(0, 60)}`;
            }

            steps.push({
                id: crypto.randomUUID(),
                stepIndex: stepIndex++,
                type,
                file,
                line: i + 1,
                description,
                variables: {},
                callStack: [],
            });
        }

        return steps;
    },

    stepForward(session: SimulationSession): SimulationSession {
        if (session.currentStepIndex < session.steps.length - 1) {
            return { ...session, currentStepIndex: session.currentStepIndex + 1, status: 'paused' };
        }
        return { ...session, status: 'complete' };
    },

    stepBack(session: SimulationSession): SimulationSession {
        if (session.currentStepIndex > 0) {
            return { ...session, currentStepIndex: session.currentStepIndex - 1, status: 'paused' };
        }
        return session;
    },

    jumpToStep(session: SimulationSession, index: number): SimulationSession {
        const clamped = Math.max(0, Math.min(index, session.steps.length - 1));
        return { ...session, currentStepIndex: clamped, status: 'paused' };
    },

    play(session: SimulationSession): SimulationSession {
        return { ...session, status: 'playing' };
    },

    pause(session: SimulationSession): SimulationSession {
        return { ...session, status: 'paused' };
    },

    getCurrentStep(session: SimulationSession): ExecutionStep | null {
        return session.steps[session.currentStepIndex] ?? null;
    },
};
