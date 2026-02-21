'use client';

import { useState } from 'react';
import Link from 'next/link';

type IngestStatus = 'idle' | 'validating' | 'fetching' | 'storing' | 'complete' | 'error';

interface IngestResult {
    repository: {
        id: string;
        name: string;
        primary_language: string | null;
        frameworks: string[];
        total_files: number;
        risk_grade: string;
    };
    filesIngested: number;
    metadata: {
        languages: string[];
        frameworks: string[];
        primaryLanguage: string | null;
    };
}

const STATUS_STEPS: Array<{ key: IngestStatus; label: string; description: string }> = [
    { key: 'validating', label: 'Validating URL', description: 'Parsing GitHub repository URL…' },
    { key: 'fetching', label: 'Fetching File Tree', description: 'Connecting to GitHub API and retrieving repository structure…' },
    { key: 'storing', label: 'Storing to Neon', description: 'Writing files and metadata to your database…' },
    { key: 'complete', label: 'Ingestion Complete', description: 'Repository is ready for analysis.' },
];

const EXAMPLE_REPOS = [
    'https://github.com/vercel/next.js',
    'https://github.com/facebook/react',
    'https://github.com/microsoft/typescript',
    'https://github.com/tailwindlabs/tailwindcss',
];

export default function IngestPage() {
    const [source, setSource] = useState('github');
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<IngestStatus>('idle');
    const [result, setResult] = useState<IngestResult | null>(null);
    const [error, setError] = useState('');
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

    const handleIngest = async () => {
        if (!url.trim()) { setError('Please enter a GitHub repository URL'); return; }
        setError('');
        setResult(null);
        setLog([]);

        try {
            setStatus('validating');
            addLog(`Validating URL: ${url.trim()}`);

            const match = url.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match) {
                setError('Invalid GitHub URL. Use format: https://github.com/owner/repo');
                setStatus('error');
                return;
            }
            addLog(`✓ Detected repo: ${match[1]}/${match[2]}`);

            setStatus('fetching');
            addLog('Calling GitHub API to fetch repository tree…');

            const res = await fetch('/api/ingest/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: url.trim() }),
            });

            setStatus('storing');
            addLog('Writing file records to Neon database…');

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? 'Ingestion failed');
            }

            addLog(`✓ Stored ${data.filesIngested} source files`);
            addLog(`✓ Detected language: ${data.metadata.primaryLanguage ?? 'unknown'}`);
            if (data.metadata.frameworks?.length) {
                addLog(`✓ Detected frameworks: ${data.metadata.frameworks.join(', ')}`);
            }

            setResult(data as IngestResult);
            setStatus('complete');

        } catch (err) {
            setError(String(err));
            addLog(`✕ Error: ${String(err)}`);
            setStatus('error');
        }
    };

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === status);
    const isRunning = status === 'validating' || status === 'fetching' || status === 'storing';

    return (
        <div className="flex-1 p-8 overflow-y-auto animate-fade-in max-w-3xl">
            {/* Header */}
            <div className="mb-2">
                <Link href="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1 mb-4">
                    ← Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    Ingest Repository
                </h1>
                <p className="text-gray-400 mt-1">Import a repository to begin analysis.</p>
            </div>

            {/* URL input card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow mt-6">

                {/* Source selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Repository Source</label>
                    <div className="flex gap-2">
                        {['github', 'gitlab', 'local', 'zip'].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { setSource(s); setStatus('idle'); setError(''); setLog([]); setResult(null); }}
                                disabled={isRunning}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${source === s
                                    ? 'bg-violet-600 border-violet-500 text-white'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {source === 'github' && (
                    <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">GitHub Repository URL</label>
                        <div className="flex gap-3">
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !isRunning && handleIngest()}
                                placeholder="https://github.com/owner/repository"
                                disabled={isRunning}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono disabled:opacity-50"
                            />
                            <button
                                onClick={handleIngest}
                                disabled={isRunning || !url.trim()}
                                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                            >
                                {isRunning ? 'Ingesting…' : 'Ingest →'}
                            </button>
                        </div>

                        {/* Example repos */}
                        <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-1.5">Examples:</p>
                            <div className="flex flex-wrap gap-2">
                                {EXAMPLE_REPOS.map(ex => (
                                    <button
                                        key={ex}
                                        onClick={() => setUrl(ex)}
                                        disabled={isRunning}
                                        className="text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 rounded-lg transition-colors font-mono disabled:opacity-40"
                                    >
                                        {ex.replace('https://github.com/', '')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {source === 'gitlab' && (
                    <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">GitLab Repository URL</label>
                        <div className="flex gap-3">
                            <input
                                placeholder="https://gitlab.com/owner/repository"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                            />
                            <button
                                onClick={() => setError('GitLab ingestion endpoints are currently in development. Please use GitHub for the demo.')}
                                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                            >
                                Ingest →
                            </button>
                        </div>
                    </>
                )}

                {(source === 'local' || source === 'zip') && (
                    <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{source === 'local' ? 'Local Directory' : 'ZIP Archive'}</label>
                        <div className="border-2 border-dashed border-gray-700 hover:border-violet-500/50 transition-colors bg-gray-800/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl mb-4">{source === 'local' ? '📁' : '📦'}</span>
                            <p className="text-gray-300 font-medium mb-1">
                                {source === 'local' ? 'Select a folder to analyze' : 'Upload a .zip codebase'}
                            </p>
                            <p className="text-xs text-gray-500 mb-4 max-w-sm border-b border-gray-800 pb-4">
                                On-device analysis provides 100% privacy by keeping source code on your local machine. No code is uploaded to external clouds.
                            </p>
                            <button
                                // Use the same fail-message logic for demo
                                onClick={() => setError(`Analyzing ${source === 'local' ? 'local directories' : 'ZIP archives'} requires the Up2Code Local CLI tool to run securely. Code blocks are not uploaded to the cloud database in the Demo environment.`)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {source === 'local' ? 'Choose Directory...' : 'Select File...'}
                            </button>
                        </div>
                    </>
                )}

                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                        {error}
                    </div>
                )}
            </div>

            {/* Progress steps */}
            {status !== 'idle' && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4 card-glow">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Ingestion Progress</p>
                    <div className="space-y-3">
                        {STATUS_STEPS.map((step, i) => {
                            const isDone = status === 'complete' || (currentStepIndex > i);
                            const isActive = i === currentStepIndex && status !== 'complete';
                            const isPending = currentStepIndex < i && status !== 'complete';

                            return (
                                <div key={step.key} className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-all ${isDone ? 'bg-emerald-500 text-white' :
                                        isActive ? 'bg-violet-600 text-white pulse-ring' :
                                            'bg-gray-800 text-gray-600'
                                        }`}>
                                        {isDone ? '✓' : i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium transition-colors ${isDone ? 'text-emerald-400' :
                                            isActive ? 'text-white' :
                                                'text-gray-600'
                                            }`}>{step.label}</p>
                                        {isActive && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Activity log */}
                    {log.length > 0 && (
                        <div className="mt-4 bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-400 space-y-0.5 max-h-32 overflow-y-auto">
                            {log.map((line, i) => (
                                <p key={i} className={line.includes('✓') ? 'text-emerald-400' : line.includes('✕') ? 'text-red-400' : 'text-gray-500'}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Success result */}
            {status === 'complete' && result && (
                <div className="bg-gray-900 border border-emerald-500/30 rounded-xl p-6 mt-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <h3 className="text-white font-semibold">Repository Ingested Successfully</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                            { label: 'Repository', value: result.repository.name },
                            { label: 'Files Imported', value: result.filesIngested.toString() },
                            { label: 'Primary Language', value: result.metadata.primaryLanguage ?? 'Unknown' },
                            { label: 'Frameworks', value: result.metadata.frameworks?.join(', ') || 'None detected' },
                        ].map(item => (
                            <div key={item.label} className="bg-gray-800/60 rounded-lg p-3">
                                <p className="text-xs text-gray-500">{item.label}</p>
                                <p className="text-sm text-white font-medium mt-0.5 truncate">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <Link href="/"
                            className="flex-1 text-center py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                            View on Dashboard
                        </Link>
                        <Link href="/explorer"
                            className="flex-1 text-center py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                            Explore Code
                        </Link>
                        <button
                            onClick={() => { setStatus('idle'); setUrl(''); setResult(null); setLog([]); }}
                            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors"
                        >
                            Ingest Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
