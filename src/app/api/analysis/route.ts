import { NextResponse } from 'next/server';
import { githubIngestion } from '@/ingestion/github';
import { securityScanner } from '@/analysis/security';
import { complexityAnalyser } from '@/analysis/complexity';
import { refactorAnalyser as refactorAdvisor } from '@/analysis/refactor';
import { filesRepo } from '@/db/repositories/files';
import { repositoryRepo } from '@/db/repositories/repositories';
import { analysisResultsRepo, type AnalysisIssue } from '@/db/repositories/analysis-results';
import { governanceScorer } from '@/governance/scoring';
import { logger } from '@/core/logger';

/**
 * POST /api/analyse
 * Body: { repositoryId: string, types?: string[] }
 *
 * Fetches source files for the repository, runs the requested analyses,
 * persists results to analysis_results, and updates the repo risk score.
 */
export async function POST(req: Request) {
    const start = Date.now();

    try {
        const { repositoryId, types = ['security', 'complexity', 'refactor'], path: filePath } = await req.json() as {
            repositoryId: string;
            types?: string[];
            path?: string;
        };

        if (!repositoryId) {
            return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 });
        }

        const repo = await repositoryRepo.findById(repositoryId);
        if (!repo) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }

        // Get source_url to derive owner/repo for GitHub content fetching
        const urlMatch = repo.source_url?.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlMatch) {
            return NextResponse.json({ error: 'Repository has no valid GitHub URL for content fetching' }, { status: 400 });
        }
        const [, owner, repoName] = urlMatch;

        // Load all files for this repository
        const files = await filesRepo.findByRepository(repositoryId);
        if (!files.length) {
            return NextResponse.json({ error: 'No files found — run ingestion first' }, { status: 400 });
        }

        logger.info('Analysis started', { repositoryId, types, fileCount: files.length });

        // Only scan source code files worth analysing (skip large/binary)
        const SOURCE_EXTS = /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cs|php|html|css|sql)$/i;
        const scannable = files.filter(f => SOURCE_EXTS.test(f.path));

        const allSecurityIssues: AnalysisIssue[] = [];
        const allComplexityIssues: AnalysisIssue[] = [];
        const allRefactorIssues: AnalysisIssue[] = [];

        // Fetch content and scan — limit to first 30 files to avoid rate limits
        let filesToScan = scannable.slice(0, 30);
        if (filePath) {
            filesToScan = scannable.filter(f => f.path === filePath);
            if (!filesToScan.length) {
                return NextResponse.json({ error: 'File not found or not scannable' }, { status: 400 });
            }
        }

        for (const file of filesToScan) {
            let content: string;
            try {
                content = await githubIngestion.getFileContent(owner, repoName, file.path);
            } catch {
                logger.warn('Could not fetch file content', { path: file.path });
                continue;
            }

            if (types.includes('security')) {
                // securityScanner.scan returns SecurityIssue[] directly
                const secIssues = securityScanner.scan(file.path, content);
                for (const finding of secIssues) {
                    allSecurityIssues.push({
                        ruleId: finding.rule,
                        description: finding.description,
                        file: file.path,
                        line: finding.line,
                        severity: finding.severity as AnalysisIssue['severity'],
                        category: finding.category,
                        match: finding.snippet,
                        // Extended fields stored in JSONB
                        ...(finding.implication ? { implication: finding.implication } : {}),
                        ...(finding.remediation ? { remediation: finding.remediation } : {}),
                    } as AnalysisIssue & { implication?: string; remediation?: string });
                }
            }

            if (types.includes('complexity')) {
                // complexityAnalyser uses cyclomaticComplexity / cognitiveComplexity
                const cx = complexityAnalyser.analyse(file.path, content);
                if (cx.cyclomaticComplexity > 10 || cx.cognitiveComplexity > 15) {
                    allComplexityIssues.push({
                        ruleId: 'COMPLEX001',
                        description: `Code block is overly complex and difficult to maintain`,
                        file: file.path,
                        line: cx.maxDepthLine,
                        severity: cx.cyclomaticComplexity > 20 ? 'high' : 'medium',
                        category: 'complexity',
                        // @ts-ignore
                        implication: `High complexity (Cyclomatic: ${cx.cyclomaticComplexity}, Cognitive: ${cx.cognitiveComplexity}) increases the risk of bugs during future modifications and makes the code harder to read. Deepest nesting found around line ${cx.maxDepthLine}.`,
                        remediation: `Consider breaking down this logic into smaller, more focused functions or modules. Extract the logic around line ${cx.maxDepthLine} into a dedicated helper function to reduce overall file complexity.`,
                    });
                }
            }

            if (types.includes('refactor')) {
                // refactorAnalyser.analyse returns RefactorSuggestion[] directly
                const suggestions = refactorAdvisor.analyse(file.path, content);
                for (const suggestion of suggestions) {
                    allRefactorIssues.push({
                        ruleId: `REFACTOR_${suggestion.type.toUpperCase()}`,
                        description: suggestion.description,
                        file: file.path,
                        line: suggestion.line,
                        severity: 'low',
                        category: 'refactor',
                        // @ts-ignore
                        remediation: suggestion.example || 'Review and apply cleaner coding patterns.',
                    });
                }
            }
        }

        const duration = Date.now() - start;

        const getExistingIssues = async (type: string) => {
            if (!filePath) return [];
            const existing = await analysisResultsRepo.findByRepository(repositoryId, type as any);
            return existing.flatMap(r => r.results || []).filter(i => i.file !== filePath);
        };

        const existingSec = await getExistingIssues('security');
        const existingComp = await getExistingIssues('complexity');
        const existingRefact = await getExistingIssues('refactor');

        const finalSec = filePath ? [...existingSec, ...allSecurityIssues] : allSecurityIssues;
        const finalComp = filePath ? [...existingComp, ...allComplexityIssues] : allComplexityIssues;
        const finalRefact = filePath ? [...existingRefact, ...allRefactorIssues] : allRefactorIssues;

        // Persist results per analysis type
        const saved: Record<string, number> = {};
        const totalScannedForSummary = filePath ? files.length : filesToScan.length;

        if (types.includes('security') && finalSec.length >= 0) {
            const severityCounts = finalSec.reduce<Record<string, number>>((acc, i) => {
                acc[i.severity] = (acc[i.severity] ?? 0) + 1; return acc;
            }, {});
            await analysisResultsRepo.upsertForRepo({
                repository_id: repositoryId,
                type: 'security',
                issues: finalSec,
                summary: { total: finalSec.length, byseverity: severityCounts, filesScanned: totalScannedForSummary },
                duration_ms: duration,
            });
            saved.security = finalSec.length;
        }

        if (types.includes('complexity') && finalComp.length >= 0) {
            await analysisResultsRepo.upsertForRepo({
                repository_id: repositoryId,
                type: 'complexity',
                issues: finalComp,
                summary: { total: finalComp.length, filesScanned: totalScannedForSummary },
                duration_ms: duration,
            });
            saved.complexity = finalComp.length;
        }

        if (types.includes('refactor') && finalRefact.length >= 0) {
            await analysisResultsRepo.upsertForRepo({
                repository_id: repositoryId,
                type: 'refactor',
                issues: finalRefact,
                summary: { total: finalRefact.length, filesScanned: totalScannedForSummary },
                duration_ms: duration,
            });
            saved.refactor = finalRefact.length;
        }

        // Re-score the repository based on findings
        // governanceScorer.calculate accepts SecurityIssue-compatible objects
        const allIssues = [...finalSec, ...finalComp, ...finalRefact];
        const scoreResult = governanceScorer.calculate(
            allIssues.map(i => ({
                file: i.file,
                line: i.line ?? 0,
                column: 0,
                rule: i.ruleId,
                description: i.description,
                severity: i.severity as Extract<AnalysisIssue['severity'], "critical" | "high" | "medium" | "low" | "info">,
                snippet: i.match ?? '',
            })),
            files.length
        );
        await repositoryRepo.updateRiskScore(repositoryId, scoreResult.score, scoreResult.grade);
        await repositoryRepo.updateMetadata(repositoryId, { last_analysed_at: new Date().toISOString() });

        logger.info('Analysis complete', { repositoryId, saved, score: scoreResult.score });

        return NextResponse.json({
            repositoryId,
            filesScanned: filesToScan.length,
            issuesFound: saved,
            riskScore: scoreResult.score,
            riskGrade: scoreResult.grade,
            durationMs: duration,
        });

    } catch (err) {
        logger.error('Analysis failed', { error: String(err) });
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * GET /api/analyse?repositoryId=xxx&type=security
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const repositoryId = searchParams.get('repositoryId');
        const type = searchParams.get('type') as 'security' | 'complexity' | 'refactor' | null;

        if (!repositoryId) {
            return NextResponse.json({ error: 'repositoryId required' }, { status: 400 });
        }

        const results = await analysisResultsRepo.findByRepository(repositoryId, type ?? undefined);
        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
