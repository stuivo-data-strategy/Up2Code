/**
 * Local Directory Scanner
 * Walks a local filesystem directory and returns file paths + contents.
 * Server-side only (Node.js).
 */

export interface LocalFile {
    path: string;
    relativePath: string;
    content: string;
    size: number;
    extension: string;
}

const SOURCE_EXTS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'cs', 'cpp', 'c', 'php',
    'swift', 'kt', 'html', 'css', 'scss', 'sql', 'json', 'yaml', 'yml', 'toml', 'md',
]);

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.cache', '.next']);

export const localIngestion = {
    async scanDirectory(rootPath: string): Promise<LocalFile[]> {
        // Dynamic import keeps this server-side only
        const fs = await import('fs/promises');
        const path = await import('path');
        const results: LocalFile[] = [];

        async function walk(dir: string) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!EXCLUDE_DIRS.has(entry.name)) await walk(full);
                } else {
                    const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
                    if (SOURCE_EXTS.has(ext)) {
                        const stat = await fs.stat(full);
                        const content = await fs.readFile(full, 'utf-8');
                        results.push({
                            path: full,
                            relativePath: path.relative(rootPath, full),
                            content,
                            size: stat.size,
                            extension: ext,
                        });
                    }
                }
            }
        }

        await walk(rootPath);
        return results;
    },
};
