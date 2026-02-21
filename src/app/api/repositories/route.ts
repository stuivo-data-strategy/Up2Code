import { NextResponse } from 'next/server';
import { repositoryRepo } from '@/db/repositories/repositories';
import { userRepo } from '@/db/repositories/users';

async function getDemoUserId(): Promise<string> {
    const user = await userRepo.getOrCreateDemoUser();
    return user.id;
}

export async function GET() {
    try {
        const userId = await getDemoUserId();
        const repos = await repositoryRepo.findAll(userId);
        return NextResponse.json(repos);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userId = await getDemoUserId();

        const repo = await repositoryRepo.create({
            user_id: userId,
            name: body.name,
            full_name: body.full_name ?? null,
            description: body.description ?? null,
            source: body.source ?? 'github',
            source_url: body.source_url ?? null,
            primary_language: null,
            frameworks: [],
            total_files: 0,
            risk_score: 0,
            risk_grade: 'A',
            metadata: {},
            last_analysed_at: null,
        });

        return NextResponse.json(repo, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await repositoryRepo.delete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
