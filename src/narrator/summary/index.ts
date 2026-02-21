/**
 * Behavioural Narrator — holistic repository summary generator.
 */
import type { ASTResult } from '@/mapper/ast';
import type { DependencyGraph } from '@/mapper/dependencies';
import type { RepositoryMetadata } from '@/ingestion/metadata';

export interface RepoSummary {
    name: string;
    primaryLanguage: string;
    frameworks: string[];
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    externalDependencies: number;
    narrative: string;
}

export const summaryNarrator = {
    generate(
        repoName: string,
        metadata: Partial<RepositoryMetadata>,
        asts: ASTResult[],
        graph: DependencyGraph
    ): RepoSummary {
        const totalFunctions = asts.reduce((sum, a) => sum + a.functions.length, 0);
        const totalClasses = asts.reduce((sum, a) => sum + a.classes.length, 0);
        const lang = metadata.primaryLanguage ?? 'Unknown';
        const frameworks = metadata.frameworks ?? [];

        const narrative = [
            `${repoName} is a ${lang} codebase`,
            frameworks.length ? `built with ${frameworks.join(', ')}` : '',
            `comprising ${metadata.totalFiles ?? asts.length} files,`,
            `${totalFunctions} functions, and ${totalClasses} classes.`,
            graph.externalDeps.length
                ? `It depends on ${graph.externalDeps.length} external packages including ${graph.externalDeps.slice(0, 3).join(', ')}.`
                : '',
            graph.nodes.length > 10
                ? `The architecture is moderately complex with ${graph.edges.length} internal module relationships.`
                : `The architecture is compact and straightforward.`,
        ].filter(Boolean).join(' ');

        return {
            name: repoName,
            primaryLanguage: lang,
            frameworks,
            totalFiles: metadata.totalFiles ?? asts.length,
            totalFunctions,
            totalClasses,
            externalDependencies: graph.externalDeps.length,
            narrative,
        };
    },
};
