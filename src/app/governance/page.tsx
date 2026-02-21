'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { governanceScorer, computeFileScore } from '@/governance/scoring';

interface Repository {
    id: string;
    name: string;
    risk_score: number;
    risk_grade: string;
    total_files: number;
    last_analysed_at: string | null;
}

interface AnalysisIssue {
    ruleId: string;
    description: string;
    file: string;
    line?: number;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category?: string;
}

interface AnalysisResult {
    id: string;
    type: string;
    results: AnalysisIssue[];   // matches DB column "results"
    summary: Record<string, unknown>;
    duration_ms: number;
    created_at: string;
}

const SEV_COLORS = {
    critical: { bar: '#ef4444', badge: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    high: { bar: '#f97316', badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
    medium: { bar: '#eab308', badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
    low: { bar: '#22c55e', badge: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    info: { bar: '#6b7280', badge: 'bg-gray-500/20 text-gray-400 border border-gray-600' },
};

const GRADE_COLORS: Record<string, string> = {
    A: 'text-emerald-400', B: 'text-cyan-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400',
};

function heatColor(val: number) {
    if (val === 0) return 'bg-emerald-500/20 text-emerald-400';
    if (val < 3) return 'bg-yellow-500/20 text-yellow-400';
    if (val < 8) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/30 text-red-400';
}

const CATEGORY_MAP: Record<string, string> = {
    security: 'Security', secrets: 'Security', auth: 'Security', injection: 'Security',
    gdpr: 'GDPR', pii: 'GDPR', privacy: 'GDPR', 'data-protection': 'GDPR',
    data: 'Data', sql: 'Data', database: 'Data', storage: 'Data',
    network: 'Network', cors: 'Network', http: 'Network', ssl: 'Network', tls: 'Network',
    vulnerability: 'Vulnerabilities', cve: 'Vulnerabilities', dependency: 'Vulnerabilities',
    complexity: 'Complexity',
    refactor: 'Code Quality'
};
const CATEGORY_OPTIONS = ['All', 'Security', 'GDPR', 'Data', 'Network', 'Vulnerabilities', 'Complexity', 'Code Quality'];

export default function GovernancePage() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(true);
    const [loadingResults, setLoadingResults] = useState(false);
    const [analysing, setAnalysing] = useState(false);
    const [analyseError, setAnalyseError] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSeverities, setActiveSeverities] = useState<string[]>(['critical', 'high', 'medium', 'low', 'info']);

    const [activeFileCategory, setActiveFileCategory] = useState('All');
    const [activeFileSeverities, setActiveFileSeverities] = useState<string[]>(['critical', 'high', 'medium', 'low', 'info']);

    // Ignore & Drill-down state
    const [ignoredIssues, setIgnoredIssues] = useState<Record<string, { reason: string; ignoredAt: string }>>({});
    const [ignoredFiles, setIgnoredFiles] = useState<Record<string, { reason: string; ignoredAt: string }>>({});
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [ignoringIssue, setIgnoringIssue] = useState<AnalysisIssue | null>(null);
    const [ignoringFile, setIgnoringFile] = useState<string | null>(null);
    const [ignoreReason, setIgnoreReason] = useState('');

    const [fileContent, setFileContent] = useState<string | null>(null);
    const [loadingFileContent, setLoadingFileContent] = useState(false);
    const [rescanningFile, setRescanningFile] = useState(false);

    // Instead of viewing all code, we view code for a specific issue & line
    const [viewingCodeIssue, setViewingCodeIssue] = useState<AnalysisIssue | null>(null);

    useEffect(() => {
        setFileContent(null);
        setViewingCodeIssue(null);
        setActiveFileCategory('All');
        setActiveFileSeverities(['critical', 'high', 'medium', 'low', 'info']);
    }, [selectedFile]);

    // Sort states
    const [sortBy, setSortBy] = useState<'severity-desc' | 'severity-asc' | 'category' | 'line'>('severity-desc');
    const [fileSortBy, setFileSortBy] = useState<'severity-desc' | 'severity-asc' | 'line'>('severity-desc');

    const sortIssues = (issues: any[], by: 'severity-desc' | 'severity-asc' | 'category' | 'line') => {
        return [...issues].sort((a, b) => {
            if (by === 'severity-desc' || by === 'severity-asc') {
                const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                const aVal = order[a.severity] ?? 5;
                const bVal = order[b.severity] ?? 5;
                return by === 'severity-desc' ? aVal - bVal : bVal - aVal;
            }
            if (by === 'category') {
                const catA = CATEGORY_MAP[a.category?.toLowerCase() ?? ''] || 'Security';
                const catB = CATEGORY_MAP[b.category?.toLowerCase() ?? ''] || 'Security';
                return catA.localeCompare(catB);
            }
            if (by === 'line') {
                return (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);
            }
            return 0;
        });
    };

    const getIssueHash = (i: AnalysisIssue) => `${i.file}:${i.line || 0}:${i.ruleId}`;

    // Load ignored issues & files from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('up2code_ignored_issues');
            if (stored) setIgnoredIssues(JSON.parse(stored));

            const storedFiles = localStorage.getItem('up2code_ignored_files');
            if (storedFiles) setIgnoredFiles(JSON.parse(storedFiles));
        } catch { }
    }, []);

    const toggleIgnore = (issue: AnalysisIssue, reason: string = '') => {
        const hash = getIssueHash(issue);
        const next = { ...ignoredIssues };
        if (next[hash]) {
            delete next[hash]; // restore
        } else {
            next[hash] = { reason, ignoredAt: new Date().toISOString() };
        }
        setIgnoredIssues(next);
        localStorage.setItem('up2code_ignored_issues', JSON.stringify(next));
        setIgnoringIssue(null);
        setIgnoreReason('');
    };

    const toggleIgnoreFile = (file: string, reason: string = '') => {
        const next = { ...ignoredFiles };
        if (next[file]) {
            delete next[file]; // restore
        } else {
            next[file] = { reason, ignoredAt: new Date().toISOString() };
        }
        setIgnoredFiles(next);
        localStorage.setItem('up2code_ignored_files', JSON.stringify(next));
        setIgnoringFile(null);
        setIgnoreReason('');
    };

    // Load repos on mount
    useEffect(() => {
        fetch('/api/repositories')
            .then(r => r.json())
            .then((data: Repository[]) => {
                setRepos(data);
                if (data.length) setSelectedRepo(data[0]);
            })
            .finally(() => setLoadingRepos(false));
    }, []);

    // Load analysis results when repo changes
    useEffect(() => {
        if (!selectedRepo) return;
        setLoadingResults(true);
        setResults([]);
        fetch(`/api/analysis?repositoryId=${selectedRepo.id}`)
            .then(r => r.json())
            .then((data: AnalysisResult[]) => setResults(Array.isArray(data) ? data : []))
            .finally(() => setLoadingResults(false));
    }, [selectedRepo]);

    const runAnalysis = async () => {
        if (!selectedRepo) return;
        setAnalysing(true);
        setAnalyseError('');
        try {
            const res = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repositoryId: selectedRepo.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Analysis failed');

            // Refresh repo and results
            const updatedRepos = await fetch('/api/repositories').then(r => r.json());
            setRepos(updatedRepos);
            const updated = updatedRepos.find((r: Repository) => r.id === selectedRepo.id);
            if (updated) setSelectedRepo(updated);

            const updatedResults = await fetch(`/api/analysis?repositoryId=${selectedRepo.id}`).then(r => r.json());
            setResults(Array.isArray(updatedResults) ? updatedResults : []);
        } catch (err) {
            setAnalyseError(String(err));
        } finally {
            setAnalysing(false);
        }
    };

    const fetchFileContent = async (issue: AnalysisIssue) => {
        if (!selectedRepo || !selectedFile) return;
        setViewingCodeIssue(issue);
        if (fileContent) return; // already loaded for this file

        setLoadingFileContent(true);
        try {
            const res = await fetch(`/api/analysis/file?repositoryId=${selectedRepo.id}&path=${encodeURIComponent(selectedFile)}`);
            const data = await res.json();
            if (data.content) {
                setFileContent(data.content);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingFileContent(false);
        }
    };

    const rescanFile = async () => {
        if (!selectedRepo || !selectedFile) return;
        setRescanningFile(true);
        try {
            const res = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repositoryId: selectedRepo.id, path: selectedFile }),
            });
            if (!res.ok) throw new Error('Rescan failed');

            const updatedRepos = await fetch('/api/repositories').then(r => r.json());
            setRepos(updatedRepos);
            const updated = updatedRepos.find((r: Repository) => r.id === selectedRepo.id);
            if (updated) setSelectedRepo(updated);

            const updatedResults = await fetch(`/api/analysis?repositoryId=${selectedRepo.id}`).then(r => r.json());
            setResults(Array.isArray(updatedResults) ? updatedResults : []);

        } catch (err) {
            console.error(err);
        } finally {
            setRescanningFile(false);
        }
    };

    // Aggregate all issues across all result records
    const allIssues = results.flatMap(r => r.results ?? []).map(i => ({
        ...i,
        canonicalCategory: CATEGORY_MAP[i.category?.toLowerCase() ?? ''] || 'Security'
    }));
    const securityIssues = allIssues.filter(i => ['critical', 'high', 'medium', 'low', 'info'].includes(i.severity));
    const activeSecurityIssues = securityIssues.filter(i => !ignoredIssues[getIssueHash(i)] && !ignoredFiles[i.file]);

    const filteredIssues = activeSecurityIssues
        .filter(i => activeCategory === 'All' || i.canonicalCategory === activeCategory)
        .filter(i => activeSeverities.includes(i.severity));

    const CATEGORY_COLORS: Record<string, string> = {
        'Security': '#ef4444',
        'GDPR': '#f59e0b',
        'Data': '#3b82f6',
        'Network': '#8b5cf6',
        'Vulnerabilities': '#ec4899',
        'Complexity': '#10b981',
        'Code Quality': '#34d399',
        'Other': '#6b7280'
    };

    const chartData = CATEGORY_OPTIONS.filter(cat => cat !== 'All').map(cat => {
        const catIssues = activeSecurityIssues.filter(i => i.canonicalCategory === cat);
        return {
            category: cat,
            critical: catIssues.filter(i => i.severity === 'critical').length,
            high: catIssues.filter(i => i.severity === 'high').length,
            medium: catIssues.filter(i => i.severity === 'medium').length,
            low: catIssues.filter(i => i.severity === 'low').length,
            info: catIssues.filter(i => i.severity === 'info').length,
            total: catIssues.length
        };
    }).filter(d => d.total > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl shrink-0 min-w-[200px]">
                    <p className="text-gray-200 font-bold mb-2 capitalize border-b border-gray-800 pb-2">{label} Issues</p>
                    {payload.slice().reverse().map((entry: any, index: number) => {
                        if (entry.value === 0) return null;
                        return (
                            <div key={index} className="flex justify-between items-center gap-4 text-xs mb-1.5">
                                <span className="flex items-center gap-2 text-gray-400 capitalize">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }}></span>
                                    {entry.dataKey}
                                </span>
                                <span className="text-gray-200 font-mono font-bold bg-gray-800/50 px-2 py-0.5 rounded">{entry.value}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // Per-file stats
    const fileStats = allIssues.reduce<Record<string, { count: number; activeIssues: any[] }>>((acc, i) => {
        if (!acc[i.file]) acc[i.file] = { count: 0, activeIssues: [] };
        acc[i.file].count += 1;
        if (!ignoredIssues[getIssueHash(i)] && !ignoredFiles[i.file]) acc[i.file].activeIssues.push(i);
        return acc;
    }, {});
    const topFiles = Object.entries(fileStats)
        .map(([file, stats]) => ({ file, count: stats.count, score: computeFileScore(stats.activeIssues) }))
        .sort((a, b) => b.score - a.score || b.count - a.count);

    const hasResults = results.length > 0;
    const filesScanned = (results[0]?.summary?.filesScanned as number) ?? selectedRepo?.total_files ?? 1;
    const scoreData = hasResults && filesScanned ? governanceScorer.calculate(activeSecurityIssues as any, filesScanned) : null;

    const displayScore = scoreData ? `${scoreData.score}/100` : `${selectedRepo?.risk_score}/100`;
    const displayGrade = scoreData ? scoreData.grade : selectedRepo?.risk_grade ?? '-';

    return (
        <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        Governance & Compliance
                    </h1>
                    <p className="text-gray-400 mt-1">Security posture, risk scoring, and sensitive-data assessment.</p>
                </div>

                {/* Repo selector + Analyse button */}
                <div className="flex items-center gap-3">
                    <select
                        value={selectedRepo?.id ?? ''}
                        onChange={e => {
                            const r = repos.find(r => r.id === e.target.value);
                            if (r) setSelectedRepo(r);
                        }}
                        className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                    >
                        {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button
                        onClick={runAnalysis}
                        disabled={analysing || !selectedRepo}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                        {analysing ? '⏳ Scanning…' : '▶ Run Analysis'}
                    </button>
                </div>
            </div>

            {analyseError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">{analyseError}</div>
            )}

            {/* No repos / not analysed yet */}
            {loadingRepos && <p className="text-gray-500 text-sm">Loading repositories…</p>}

            {!loadingRepos && !selectedRepo && (
                <div className="text-center py-20 text-gray-500">
                    No repositories found. <a href="/ingest" className="text-violet-400 hover:underline">Ingest one first →</a>
                </div>
            )}

            {selectedRepo && !hasResults && !loadingResults && !analysing && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl mx-auto mb-4">⚖</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No analysis yet for <span className="text-violet-300">{selectedRepo.name}</span></h3>
                    <p className="text-sm text-gray-500 mb-6">Click <strong>Run Analysis</strong> to scan {selectedRepo.total_files} files for security issues, complexity, and refactoring opportunities.</p>
                </div>
            )}

            {loadingResults && <p className="text-gray-500 text-sm animate-pulse">Loading analysis results…</p>}

            {/* Results */}
            {hasResults && selectedRepo && (
                <>
                    {/* Summary row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Risk Score (Active)', value: displayScore, color: GRADE_COLORS[displayGrade] ?? 'text-gray-400' },
                            { label: 'Risk Grade', value: displayGrade, color: GRADE_COLORS[displayGrade] ?? 'text-gray-400' },
                            { label: 'Total Active Issues', value: activeSecurityIssues.length.toString(), color: 'text-white' },
                            { label: 'Files Scanned', value: filesScanned.toString(), color: 'text-cyan-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 card-glow">
                                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                        {/* Bar chart */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-glow flex flex-col">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Issues by Severity & Category</p>
                            <p className="text-sm text-gray-400 mt-2 max-w-sm">
                                Distribution of vulnerabilities, code smells, and architectural issues across your selected repository.
                            </p>
                            {chartData.length > 0 && (
                                <div className="flex-1 w-full min-h-[200px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <XAxis dataKey="category" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                                            <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} allowDecimals={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                                            <Bar dataKey="critical" stackId="a" fill={SEV_COLORS.critical.bar} />
                                            <Bar dataKey="high" stackId="a" fill={SEV_COLORS.high.bar} />
                                            <Bar dataKey="medium" stackId="a" fill={SEV_COLORS.medium.bar} />
                                            <Bar dataKey="low" stackId="a" fill={SEV_COLORS.low.bar} />
                                            <Bar dataKey="info" stackId="a" fill={SEV_COLORS.info.bar} radius={[0, 0, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Affected files */}
                        {topFiles.length > 0 && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-glow flex flex-col min-h-[250px] max-h-[400px]">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 shrink-0">Affected Files</p>
                                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {topFiles.map((entry) => {
                                        const isIgnored = !!ignoredFiles[entry.file];
                                        return (
                                            <div
                                                key={entry.file}
                                                className={`flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg cursor-pointer transition-colors ${isIgnored ? 'opacity-50 hover:bg-gray-800' : 'hover:bg-gray-800'}`}
                                                onClick={() => setSelectedFile(entry.file)}
                                            >
                                                <span className={`font-mono text-xs flex-1 truncate ${isIgnored ? 'line-through text-gray-500' : 'text-gray-400'}`}>{entry.file}</span>
                                                {isIgnored ? (
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-gray-800 text-gray-500 border border-gray-700">Ignored</span>
                                                ) : (
                                                    <>
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-gray-800 text-gray-300 border border-gray-700">Score {entry.score}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${heatColor(entry.count)}`}>{entry.count}</span>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Issue list */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-glow">
                        <div className="flex items-center justify-between xl:flex-row flex-col gap-4 mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                All Issues <span className="text-gray-700 ml-1">({filteredIssues.length})</span>
                            </p>
                            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800/50 flex-wrap gap-1">
                                {CATEGORY_OPTIONS.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3 py-1 text-xs rounded-md transition-all ${activeCategory === cat
                                            ? 'bg-gray-800 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800/50 flex-wrap gap-1 ml-auto">
                                {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
                                    const isActive = activeSeverities.includes(sev);
                                    return (
                                        <button
                                            key={sev}
                                            onClick={() => {
                                                if (isActive) setActiveSeverities(activeSeverities.filter(s => s !== sev));
                                                else setActiveSeverities([...activeSeverities, sev]);
                                            }}
                                            className={`px-3 py-1 text-xs rounded-md transition-all capitalize ${isActive
                                                ? SEV_COLORS[sev].badge
                                                : 'text-gray-600 hover:bg-gray-800/50 border border-transparent'
                                                }`}
                                        >
                                            {sev}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap w-full xl:w-auto mt-2 xl:mt-0">
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as any)}
                                    className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500"
                                >
                                    <option value="severity-desc">Severity (High to Low)</option>
                                    <option value="severity-asc">Severity (Low to High)</option>
                                    <option value="category">Category</option>
                                    <option value="line">Line Number</option>
                                </select>
                            </div>
                        </div>
                        {filteredIssues.length === 0 ? (
                            <p className="text-sm text-emerald-400">✓ No issues found in this category — clean scan!</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {sortIssues(filteredIssues, sortBy).map((issue, i) => {
                                    const ignored = ignoredIssues[getIssueHash(issue)];
                                    return (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg transition-colors border ${ignored ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-gray-800/50 hover:bg-gray-800 border-transparent'}`}>
                                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${SEV_COLORS[issue.severity as keyof typeof SEV_COLORS]?.badge ?? ''}`}>
                                                {issue.severity}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm text-gray-200 ${ignored ? 'line-through text-gray-500' : ''}`}>{issue.description}</p>
                                                <p className="text-xs text-gray-600 mt-0.5 font-mono">{issue.file}{issue.line ? `:${issue.line}` : ''}</p>
                                                {ignored && <p className="text-xs text-yellow-500 mt-1">Ignored: {ignored.reason}</p>}
                                            </div>
                                            <span className="text-xs text-gray-600 shrink-0 font-mono">{issue.ruleId}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-600 mt-3 text-right">
                        Last scanned: {selectedRepo.last_analysed_at ? new Date(selectedRepo.last_analysed_at).toLocaleString() : 'Never'}
                        {results[0] && ` · Took ${results[0].duration_ms}ms`}
                    </p>
                </>
            )}

            {/* Ignored Reason Modal */}
            {ignoringIssue && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Ignore Issue</h3>
                        <p className="text-sm text-gray-400 mb-4 truncate">{ignoringIssue.description}</p>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Reason for ignoring..."
                            className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 mb-4"
                            value={ignoreReason}
                            onChange={(e) => setIgnoreReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIgnoringIssue(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                            <button
                                onClick={() => toggleIgnore(ignoringIssue, ignoreReason)}
                                disabled={!ignoreReason.trim()}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
                            >
                                Confirm Ignore
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ignored File Modal */}
            {ignoringFile && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Ignore File</h3>
                        <p className="text-sm text-gray-400 mb-4 truncate font-mono">{ignoringFile}</p>
                        <p className="text-xs text-amber-500/80 mb-4">Ignoring this file will remove all of its issues from the dashboard and lower the overall risk score.</p>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Reason for ignoring..."
                            className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 mb-4"
                            value={ignoreReason}
                            onChange={(e) => setIgnoreReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIgnoringFile(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                            <button
                                onClick={() => toggleIgnoreFile(ignoringFile, ignoreReason)}
                                disabled={!ignoreReason.trim()}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
                            >
                                Confirm Ignore
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* File Drill-down Panel Placeholder */}
            {selectedFile && (
                <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col items-stretch animate-fade-in custom-scrollbar overflow-y-auto">
                    <div className="p-5 border-b border-gray-800 bg-gray-950/50 flex flex-col gap-4 sticky top-0 bg-gray-900/90 backdrop-blur z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-bold text-white break-all">{selectedFile.split('/').pop()}</h2>
                                <p className="text-xs text-gray-500 font-mono mt-1">{selectedFile}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                <button
                                    onClick={() => { if (ignoredFiles[selectedFile]) toggleIgnoreFile(selectedFile); else { setIgnoringFile(selectedFile); setIgnoreReason(''); } }}
                                    className={`px-2 py-1 text-[11px] font-medium border rounded transition-colors ${ignoredFiles[selectedFile] ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                                >
                                    {ignoredFiles[selectedFile] ? 'Restore File' : 'Ignore File'}
                                </button>
                                <button
                                    onClick={rescanFile}
                                    disabled={rescanningFile}
                                    className="px-2 py-1 text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                                >
                                    {rescanningFile ? 'Scanning...' : 'Rescan File'}
                                </button>

                                <select
                                    value={fileSortBy}
                                    onChange={e => setFileSortBy(e.target.value as any)}
                                    className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500"
                                >
                                    <option value="severity-desc">Severity (High to Low)</option>
                                    <option value="severity-asc">Severity (Low to High)</option>
                                    <option value="line">Line Number</option>
                                </select>
                                <button onClick={() => setSelectedFile(null)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg">✕</button>
                            </div>
                        </div>

                        {/* File Level Filters */}
                        {!viewingCodeIssue && (
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800/50 flex-wrap gap-1">
                                    {CATEGORY_OPTIONS.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveFileCategory(cat)}
                                            className={`px-3 py-1 text-[10px] rounded-md transition-all ${activeFileCategory === cat
                                                ? 'bg-gray-800 text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800/50 flex-wrap gap-1 ml-auto">
                                    {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
                                        const isActive = activeFileSeverities.includes(sev);
                                        return (
                                            <button
                                                key={sev}
                                                onClick={() => {
                                                    if (isActive) setActiveFileSeverities(activeFileSeverities.filter(s => s !== sev));
                                                    else setActiveFileSeverities([...activeFileSeverities, sev]);
                                                }}
                                                className={`px-3 py-1 text-[10px] rounded-md transition-all capitalize ${isActive
                                                    ? SEV_COLORS[sev].badge
                                                    : 'text-gray-600 hover:bg-gray-800/50 border border-transparent'
                                                    }`}
                                            >
                                                {sev}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 flex-1 space-y-6 flex flex-col">
                        {viewingCodeIssue ? (
                            <div className="bg-gray-950 border border-gray-800 rounded-xl flex-1 flex flex-col min-h-0 relative">
                                <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-xl sticky top-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setViewingCodeIssue(null)} className="text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-gray-300">← Back to issues</button>
                                        <h3 className="text-sm font-bold text-gray-300">File Context</h3>
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono">Line: {viewingCodeIssue.line ?? 'Unknown'}</span>
                                </div>

                                {!viewingCodeIssue.line && (
                                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400">
                                        ⚠ This issue applies to the whole file. No specific line number was flagged by the scanner.
                                    </div>
                                )}

                                <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-[#0d1117] relative">
                                    {loadingFileContent ? (
                                        <div className="p-5 text-sm text-gray-500 animate-pulse">Loading code...</div>
                                    ) : fileContent ? (
                                        <div className="py-4 min-w-max">
                                            {fileContent.split('\n').map((lineText, i) => {
                                                const lineNum = i + 1;
                                                const isHighlighted = lineNum === viewingCodeIssue.line;

                                                // Create a stable ID only for the highlighted line so we can scroll to it
                                                const rowId = isHighlighted ? 'highlighted-code-line' : undefined;

                                                return (
                                                    <div
                                                        key={i}
                                                        id={rowId}
                                                        className={`flex px-4 hover:bg-gray-800/30 ${isHighlighted ? 'bg-red-500/10 border-y border-red-500/20' : ''}`}
                                                    >
                                                        <span className={`w-10 shrink-0 text-right pr-4 select-none font-mono text-[11px] ${isHighlighted ? 'text-red-400 font-bold' : 'text-gray-600'}`}>
                                                            {lineNum}
                                                        </span>
                                                        <span className={`font-mono text-[11px] whitespace-pre flex-1 ${isHighlighted ? 'text-red-300' : 'text-gray-400'}`}>
                                                            {lineText}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-5 text-sm text-red-500">Failed to load content.</div>
                                    )}
                                </div>
                                {/* Auto-scroll to highlight hook */}
                                {fileContent && viewingCodeIssue.line && (
                                    <div ref={el => {
                                        if (el) {
                                            setTimeout(() => {
                                                const target = document.getElementById('highlighted-code-line');
                                                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 100);
                                        }
                                    }} />
                                )}
                            </div>
                        ) : (() => {
                            const fileIssues = allIssues.filter(i => i.file === selectedFile);
                            const activeIssues = fileIssues.filter(i => !ignoredIssues[getIssueHash(i)]);
                            const filteredActiveIssues = activeIssues
                                .filter(i => activeFileCategory === 'All' || i.canonicalCategory === activeFileCategory)
                                .filter(i => activeFileSeverities.includes(i.severity));

                            const score = computeFileScore(activeIssues);
                            const colorClass = activeIssues.length === 0 ? 'text-emerald-400' : heatColor(score);
                            const issuesSorted = sortIssues(filteredActiveIssues, fileSortBy);

                            // Projection: what if all with `remediation` are fixed?
                            const projectedIssues = activeIssues.filter(i => !(i as any).remediation);
                            const projectedScore = computeFileScore(projectedIssues);

                            // Group by category based on filtered issues
                            const categories = Array.from(new Set(issuesSorted.map(i => i.canonicalCategory)));

                            return (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center">
                                            <p className="text-xs text-gray-500 mb-1">Current File Score</p>
                                            <p className="text-3xl font-bold font-mono text-white">{score}<span className="text-sm text-gray-500">/100</span></p>
                                        </div>
                                        <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center border-dashed">
                                            <p className="text-xs text-gray-500 mb-1">Projected Score</p>
                                            <p className="text-3xl font-bold font-mono text-cyan-400">{projectedScore}<span className="text-sm text-gray-500">/100</span></p>
                                            <p className="text-[10px] text-gray-500 mt-1">If mitigations applied</p>
                                        </div>
                                    </div>

                                    {categories.map(cat => (
                                        <div key={cat} className="space-y-3">
                                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{cat}</h4>
                                            {issuesSorted.filter(i => i.canonicalCategory === cat).map((issue, idx) => {
                                                const ignored = ignoredIssues[getIssueHash(issue)];
                                                // @ts-ignore
                                                const implication = issue.implication;
                                                // @ts-ignore
                                                let remediation = issue.remediation;

                                                if (!remediation && issue.category === 'complexity') {
                                                    remediation = "This file or function scores exceptionally high in complexity. Consider breaking the logic into smaller helper functions or extracting classes to reduce cognitive load.";
                                                }

                                                // Recalculate if this specific issue was fixed
                                                const ifFixedScore = computeFileScore(activeIssues.filter((i: any) => i !== issue));

                                                return (
                                                    <div key={idx} className={`bg-gray-950 border rounded-lg p-4 transition-all ${ignored ? 'border-gray-800 opacity-60' : 'border-gray-700'}`}>
                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                            <div className="flex gap-3 items-start flex-1">
                                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 mt-0.5 ${SEV_COLORS[issue.severity as keyof typeof SEV_COLORS]?.badge ?? ''}`}>
                                                                    {issue.severity}
                                                                </span>
                                                                <div>
                                                                    <p className={`text-sm font-medium ${ignored ? 'line-through text-gray-500' : 'text-gray-200'}`}>{issue.description}</p>
                                                                    <span className="text-xs font-mono text-gray-500 block mt-1">{issue.ruleId} {issue.line ? `Line: ${issue.line}` : ''}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2 shrink-0">
                                                                <button
                                                                    onClick={() => fetchFileContent(issue)}
                                                                    className="text-xs px-2 py-1 border border-gray-700 rounded bg-gray-900 hover:bg-gray-800 text-gray-300 transition-colors"
                                                                >
                                                                    {issue.line ? `View in Code (L${issue.line})` : 'View in Code'}
                                                                </button>

                                                                <button
                                                                    onClick={() => ignored ? toggleIgnore(issue) : setIgnoringIssue(issue)}
                                                                    className="text-xs shrink-0 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
                                                                >
                                                                    {ignored ? 'Restore' : 'Ignore'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {!ignored && (
                                                            <div className="mt-4 flex flex-col gap-2">
                                                                <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Context / Rule</span>
                                                                    <p className="text-xs text-gray-300">{issue.description}</p>
                                                                </div>

                                                                {implication && (
                                                                    <div className="bg-red-500/5 border border-red-500/10 rounded p-3">
                                                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1 block">Problem</span>
                                                                        <p className="text-xs text-red-200/80">{implication}</p>
                                                                    </div>
                                                                )}
                                                                {remediation && (
                                                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded p-3">
                                                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 block">Solution (Good State)</span>
                                                                        <p className="text-xs text-emerald-200/80">{remediation}</p>
                                                                        <p className="text-[10px] mt-2 font-mono text-emerald-500 flex items-center gap-1">
                                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                            Applying this reduces file risk score to {ifFixedScore}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {ignored && <p className="text-xs text-yellow-500 mt-2">Ignored: {ignored.reason}</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </>
                            );
                        })()}
                    </div>
                    <p className="text-xs text-center text-gray-500 py-4">End of file report</p>
                </div>
            )}
        </div>
    );
}
