import { NextResponse } from 'next/server';
import { securityScanner } from '@/analysis/security';
import { complianceChecker } from '@/governance/compliance';
import { governanceScorer } from '@/governance/scoring';

export async function POST(req: Request) {
    try {
        const { files } = await req.json() as { files: Array<{ path: string; content: string }> };
        const securityIssues = securityScanner.scanMany(files);
        const complianceIssues = files.flatMap((f) => complianceChecker.check(f.path, f.content));
        const score = governanceScorer.calculate(securityIssues, files.length);
        return NextResponse.json({ securityIssues, complianceIssues, score });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
