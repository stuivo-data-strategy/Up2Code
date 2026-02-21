import { NextResponse } from 'next/server';
import { filesRepo } from '@/db/repositories/files';

/**
 * GET /api/repositories/[id]/files
 * Returns the list of all files ingested for a specific repository.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Repository ID strictly required' }, { status: 400 });
        }

        const files = await filesRepo.findByRepository(id);
        return NextResponse.json(files);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
