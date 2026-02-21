/**
 * Core Event Bus
 * Simple, typed pub/sub for inter-module communication.
 */

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

class EventBus {
    private handlers: Map<string, EventHandler[]> = new Map();

    on<T>(event: string, handler: EventHandler<T>): void {
        const existing = this.handlers.get(event) ?? [];
        this.handlers.set(event, [...existing, handler as EventHandler]);
    }

    off<T>(event: string, handler: EventHandler<T>): void {
        const existing = this.handlers.get(event) ?? [];
        this.handlers.set(event, existing.filter((h) => h !== handler));
    }

    async emit<T>(event: string, payload: T): Promise<void> {
        const handlers = this.handlers.get(event) ?? [];
        await Promise.all(handlers.map((h) => h(payload)));
    }

    once<T>(event: string, handler: EventHandler<T>): void {
        const wrapper: EventHandler<T> = async (payload) => {
            await handler(payload);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

export const eventBus = new EventBus();

// Well-known event names
export const Events = {
    REPO_INGESTED: 'repo:ingested',
    ANALYSIS_COMPLETE: 'analysis:complete',
    GOVERNANCE_REPORT_READY: 'governance:report_ready',
    SIMULATION_STEP: 'simulator:step',
    TEST_SUGGESTIONS_READY: 'tests:suggestions_ready',
} as const;
