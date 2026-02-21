/**
 * Metadata Extraction Module
 * Detects languages, frameworks, and dependencies from a file tree.
 */

export interface RepositoryMetadata {
    languages: string[];
    primaryLanguage: string | null;
    frameworks: string[];
    packageManager: string | null;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    totalFiles: number;
    totalSize: number;
}

const LANGUAGE_MAP: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
    cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP', swift: 'Swift',
    kt: 'Kotlin', sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'SCSS',
};

const FRAMEWORK_SIGNALS: Array<{ file: string; framework: string }> = [
    { file: 'next.config', framework: 'Next.js' },
    { file: 'vite.config', framework: 'Vite' },
    { file: 'nuxt.config', framework: 'Nuxt.js' },
    { file: 'angular.json', framework: 'Angular' },
    { file: 'svelte.config', framework: 'Svelte' },
    { file: 'remix.config', framework: 'Remix' },
    { file: 'astro.config', framework: 'Astro' },
    { file: 'django', framework: 'Django' },
    { file: 'manage.py', framework: 'Django' },
    { file: 'rails', framework: 'Ruby on Rails' },
    { file: 'Cargo.toml', framework: 'Rust/Cargo' },
    { file: 'go.mod', framework: 'Go Modules' },
];

export const metadataExtractor = {
    extractFromPaths(paths: string[]): Partial<RepositoryMetadata> {
        const langCounts: Record<string, number> = {};
        const frameworks: string[] = [];

        for (const path of paths) {
            const ext = path.split('.').pop()?.toLowerCase() ?? '';
            const lang = LANGUAGE_MAP[ext];
            if (lang) langCounts[lang] = (langCounts[lang] ?? 0) + 1;

            for (const sig of FRAMEWORK_SIGNALS) {
                if (path.includes(sig.file) && !frameworks.includes(sig.framework)) {
                    frameworks.push(sig.framework);
                }
            }
        }

        const languages = Object.entries(langCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([lang]) => lang);

        return {
            languages,
            primaryLanguage: languages[0] ?? null,
            frameworks,
            totalFiles: paths.filter((p) => !p.endsWith('/')).length,
        };
    },

    parsePackageJson(content: string): Partial<RepositoryMetadata> {
        try {
            const pkg = JSON.parse(content);
            return {
                dependencies: pkg.dependencies ?? {},
                devDependencies: pkg.devDependencies ?? {},
                packageManager: pkg.packageManager ?? 'npm',
            };
        } catch {
            return {};
        }
    },
};
