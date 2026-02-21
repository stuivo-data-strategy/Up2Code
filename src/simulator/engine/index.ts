import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

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
        const steps: ExecutionStep[] = [];
        let stepIndex = 0;

        try {
            const ast = parse(source, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            const addStep = (node: import("@babel/types").Node, type: StepType, descPrefix: string, name?: string) => {
                if (!node.loc?.start?.line) return;
                steps.push({
                    id: crypto.randomUUID(),
                    stepIndex: stepIndex++,
                    type,
                    file,
                    line: node.loc.start.line,
                    description: name ? `${descPrefix}: ${name}` : descPrefix,
                    variables: {},
                    callStack: [],
                });
            };

            traverse(ast, {
                FunctionDeclaration(path) {
                    addStep(path.node, 'function-call', 'Enter function', path.node.id?.name);
                },
                ArrowFunctionExpression(path) {
                    let name = 'anonymous';
                    if (path.parentPath.isVariableDeclarator() && path.parentPath.node.id.type === 'Identifier') {
                        name = path.parentPath.node.id.name;
                    }
                    addStep(path.node, 'function-call', 'Enter function', name);
                },
                VariableDeclarator(path) {
                    if (path.node.id.type === 'Identifier') {
                        addStep(path.node, 'assignment', 'Assign', path.node.id.name);
                    } else {
                        addStep(path.node, 'assignment', 'Assignment/Destructure');
                    }
                },
                AssignmentExpression(path) {
                    if (path.node.left.type === 'Identifier') {
                        addStep(path.node, 'assignment', 'Assign', path.node.left.name);
                    } else {
                        addStep(path.node, 'assignment', 'Assignment');
                    }
                },
                IfStatement(path) { addStep(path.node, 'branch', 'Branch (if)'); },
                SwitchStatement(path) { addStep(path.node, 'branch', 'Branch (switch)'); },
                ConditionalExpression(path) { addStep(path.node, 'branch', 'Branch (ternary)'); },
                ForStatement(path) { addStep(path.node, 'loop', 'Loop (for)'); },
                ForOfStatement(path) { addStep(path.node, 'loop', 'Loop (for...of)'); },
                ForInStatement(path) { addStep(path.node, 'loop', 'Loop (for...in)'); },
                WhileStatement(path) { addStep(path.node, 'loop', 'Loop (while)'); },
                DoWhileStatement(path) { addStep(path.node, 'loop', 'Loop (do...while)'); },
                ReturnStatement(path) { addStep(path.node, 'return', 'Return'); },
                CallExpression(path) {
                    // Try to extract function name if we are not part of an assignment/declaration (to avoid dupes)
                    if (path.node.callee.type === 'Identifier') {
                        addStep(path.node, 'expression', 'Call', path.node.callee.name);
                    } else if (path.node.callee.type === 'MemberExpression' && path.node.callee.property.type === 'Identifier') {
                        addStep(path.node, 'expression', 'Call method', path.node.callee.property.name);
                    }
                }
            });

            // Traverse visits nodes in depth-first order.
            // For a top-to-bottom step-through, we sort primarily by line number.
            steps.sort((a, b) => a.line - b.line);

            // Re-index steps
            steps.forEach((s, i) => s.stepIndex = i);

        } catch (err) {
            console.error('Failed to parse AST for simulation steps:', err);
            // Fallback to empty if parse fails
            return [];
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
