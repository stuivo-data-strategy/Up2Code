import { NextResponse } from 'next/server';
import { repositoryRepo } from '@/db/repositories/repositories';
import { githubIngestion } from '@/ingestion/github';

/**
 * GET /api/analysis/file?repositoryId=xxx&path=xxx
 * Retrieves the raw content of a specific file from GitHub.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get('repositoryId');
    const path = searchParams.get('path');

    if (!repositoryId || !path) {
        return NextResponse.json({ error: 'repositoryId and path required' }, { status: 400 });
    }

    try {
        const repo = await repositoryRepo.findById(repositoryId);
        if (!repo) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }

        const urlMatch = repo.source_url?.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlMatch) {
            return NextResponse.json({ error: 'Repository has no valid GitHub URL for content fetching' }, { status: 400 });
        }
        const [, owner, repoName] = urlMatch;

        const content = await githubIngestion.getFileContent(owner, repoName, path);

        return NextResponse.json({ content });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
