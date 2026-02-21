import { NextResponse } from 'next/server';
import { repositoryRepo } from '@/db/repositories/repositories';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId') ?? 'demo-user';
        const repos = await repositoryRepo.findAll(userId);
        return NextResponse.json(repos);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const repo = await repositoryRepo.create(body);
        return NextResponse.json(repo, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
