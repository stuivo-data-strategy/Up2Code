/**
 * Dependency Injection Container
 * Lightweight service locator for Up2Code modules.
 */

type Factory<T> = () => T;

class Container {
    private singletons: Map<string, unknown> = new Map();
    private factories: Map<string, Factory<unknown>> = new Map();

    register<T>(token: string, factory: Factory<T>): void {
        this.factories.set(token, factory as Factory<unknown>);
    }

    resolve<T>(token: string): T {
        if (this.singletons.has(token)) {
            return this.singletons.get(token) as T;
        }
        const factory = this.factories.get(token);
        if (!factory) throw new Error(`No registration found for token: ${token}`);
        const instance = factory() as T;
        this.singletons.set(token, instance);
        return instance;
    }

    reset(): void {
        this.singletons.clear();
        this.factories.clear();
    }
}

export const container = new Container();

export const Tokens = {
    Logger: 'logger',
    DbClient: 'db.client',
    EventBus: 'event.bus',
    GithubIngestion: 'ingestion.github',
    AnalysisEngine: 'analysis.engine',
    GovernanceEngine: 'governance.engine',
    SimulatorEngine: 'simulator.engine',
    Narrator: 'narrator',
    TestGenerator: 'tests.generator',
} as const;
