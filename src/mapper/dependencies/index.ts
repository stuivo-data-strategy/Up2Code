/**
 * Dependency Graph Builder
 * Builds a map of module-to-module import relationships.
 */
import type { ASTResult } from '@/mapper/ast';

export interface DependencyEdge {
    from: string;
    to: string;
    specifiers: string[];
}

export interface DependencyGraph {
    nodes: string[];
    edges: DependencyEdge[];
    externalDeps: string[];
}

export const dependencyMapper = {
    build(astResults: ASTResult[]): DependencyGraph {
        const nodes = astResults.map((r) => r.file);
        const edges: DependencyEdge[] = [];
        const externalSet = new Set<string>();

        for (const result of astResults) {
            for (const imp of result.imports) {
                const isRelative = imp.source.startsWith('.') || imp.source.startsWith('@/');
                if (isRelative) {
                    edges.push({ from: result.file, to: imp.source, specifiers: imp.specifiers });
                } else {
                    externalSet.add(imp.source.split('/')[0]);
                }
            }
        }

        return { nodes, edges, externalDeps: Array.from(externalSet) };
    },

    findCircular(graph: DependencyGraph): string[][] {
        // Simple DFS cycle detection
        const adj = new Map<string, string[]>();
        for (const edge of graph.edges) {
            const neighbors = adj.get(edge.from) ?? [];
            neighbors.push(edge.to);
            adj.set(edge.from, neighbors);
        }

        const cycles: string[][] = [];
        const visited = new Set<string>();
        const stack = new Set<string>();

        function dfs(node: string, path: string[]) {
            if (stack.has(node)) { cycles.push([...path, node]); return; }
            if (visited.has(node)) return;
            visited.add(node);
            stack.add(node);
            for (const neighbor of adj.get(node) ?? []) dfs(neighbor, [...path, node]);
            stack.delete(node);
        }

        for (const node of graph.nodes) dfs(node, []);
        return cycles;
    },
};
