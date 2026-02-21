import { NextResponse } from 'next/server';
import { githubIngestion } from '@/ingestion/github';
import { metadataExtractor } from '@/ingestion/metadata';
import { repositoryRepo } from '@/db/repositories/repositories';
import { filesRepo } from '@/db/repositories/files';
import { userRepo } from '@/db/repositories/users';
import { logger } from '@/core/logger';

/**
 * POST /api/ingest/github
 * Body: { repoUrl: string, repositoryId?: string }
 *
 * If repositoryId is provided, re-ingests into that existing record.
 * Otherwise creates a new repository record and ingests into it.
 */
export async function POST(req: Request) {
    try {
        const { repoUrl, repositoryId } = await req.json() as {
            repoUrl: string;
            repositoryId?: string;
        };

        if (!repoUrl) {
            return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
        }

        // Parse GitHub URL: https://github.com/owner/repo
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
        if (!match) {
            return NextResponse.json(
                { error: 'Invalid GitHub URL. Expected: https://github.com/owner/repo' },
                { status: 400 }
            );
        }
        const [, owner, repoName] = match;

        logger.info('GitHub ingestion started', { owner, repoName });

        // Fetch repo metadata from GitHub
        const ghRepo = await githubIngestion.getRepo(owner, repoName);

        // Get or create the repository record in Neon
        let repoRecord;
        const user = await userRepo.getOrCreateDemoUser();

        if (repositoryId) {
            repoRecord = await repositoryRepo.findById(repositoryId);
            if (!repoRecord) {
                return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
            }
        } else {
            repoRecord = await repositoryRepo.create({
                user_id: user.id,
                name: repoName,
                full_name: ghRepo.full_name,
                description: ghRepo.description,
                source: 'github',
                source_url: repoUrl,
                primary_language: ghRepo.language,
                frameworks: [],
                total_files: 0,
                risk_score: 0,
                risk_grade: 'A',
                metadata: {
                    stars: ghRepo.stargazers_count,
                    default_branch: ghRepo.default_branch,
                },
                last_analysed_at: null,
            });
        }

        // Fetch file tree from GitHub
        const tree = await githubIngestion.getTree(owner, repoName, ghRepo.default_branch);

        // Filter to source files only
        const SOURCE_EXTS = /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|cpp|c|php|swift|kt|html|css|scss|sql|json|yaml|yml|toml|md)$/i;
        const EXCLUDES = /(node_modules|\.git|dist|build|__pycache__|\.cache|\.next)\//;
        const sourceFiles = tree.filter(
            (item) => item.type === 'blob' && SOURCE_EXTS.test(item.path) && !EXCLUDES.test(item.path)
        );

        // Extract metadata from paths
        const paths = sourceFiles.map((f) => f.path);
        const metadata = metadataExtractor.extractFromPaths(paths);

        // Upsert files into Neon (batch)
        const LANGUAGE_MAP: Record<string, string> = {
            ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
            py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
            cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP', swift: 'Swift', kt: 'Kotlin',
        };

        let filesStored = 0;
        for (const file of sourceFiles) {
            const ext = file.path.split('.').pop()?.toLowerCase() ?? '';
            await filesRepo.upsert({
                repository_id: repoRecord.id,
                path: file.path,
                extension: ext,
                size_bytes: file.size ?? 0,
                language: LANGUAGE_MAP[ext] ?? null,
            });
            filesStored++;
        }

        // Update repository with metadata
        const updated = await repositoryRepo.updateMetadata(repoRecord.id, {
            primary_language: metadata.primaryLanguage ?? ghRepo.language ?? null,
            frameworks: metadata.frameworks ?? [],
            total_files: filesStored,
        });

        logger.info('GitHub ingestion complete', { repoId: repoRecord.id, filesStored });

        return NextResponse.json({
            repository: updated,
            filesIngested: filesStored,
            metadata,
        });

    } catch (err) {
        logger.error('GitHub ingestion failed', { error: String(err) });
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
