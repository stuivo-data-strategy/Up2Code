import { NextResponse } from 'next/server';
import { securityScanner } from '@/analysis/security';
import { complexityAnalyser } from '@/analysis/complexity';
import { refactorAnalyser } from '@/analysis/refactor';

export async function POST(req: Request) {
    try {
        const { file, content } = await req.json() as { file: string; content: string };
        const security = securityScanner.scan(file, content);
        const complexity = complexityAnalyser.analyse(file, content);
        const refactor = refactorAnalyser.analyse(file, content);
        return NextResponse.json({ file, security, complexity, refactor });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
