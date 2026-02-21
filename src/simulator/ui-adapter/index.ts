/**
 * Simulator UI Adapter
 * Converts engine state into a UI-renderable format.
 */
import type { SimulationSession, ExecutionStep } from '@/simulator/engine';

export interface UISimulatorState {
    sessionId: string;
    status: SimulationSession['status'];
    currentStep: ExecutionStep | null;
    totalSteps: number;
    progress: number;
    canStepForward: boolean;
    canStepBack: boolean;
    breadcrumb: string[];
}

export function toUIState(session: SimulationSession): UISimulatorState {
    const current = session.steps[session.currentStepIndex] ?? null;
    const totalSteps = session.steps.length;
    const progress = totalSteps > 0 ? Math.round(((session.currentStepIndex + 1) / totalSteps) * 100) : 0;

    return {
        sessionId: session.id,
        status: session.status,
        currentStep: current,
        totalSteps,
        progress,
        canStepForward: session.currentStepIndex < totalSteps - 1,
        canStepBack: session.currentStepIndex > 0,
        breadcrumb: current ? [current.file, `Line ${current.line}`, current.type] : [],
    };
}
