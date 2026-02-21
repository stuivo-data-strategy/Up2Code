'use client';

import { useState, useEffect } from 'react';

type TestType = 'unit' | 'integration' | 'edge';

interface Suggestion {
    id: number;
    functionName: string;
    file: string;
    type: TestType;
    line?: number;
    description: string;
    code: string;
    accepted: boolean;
}

interface Repository {
    id: string;
    name: string;
}

interface RepoFile {
    path: string;
}

const TYPE_BADGE: Record<TestType, string> = {
    unit: 'bg-violet-500/20 text-violet-300',
    integration: 'bg-cyan-500/20 text-cyan-300',
    edge: 'bg-yellow-500/20 text-yellow-300',
};

export default function TestsPage() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    const [files, setFiles] = useState<RepoFile[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Load Repositories on mount
    useEffect(() => {
        fetch('/api/repositories')
            .then(res => res.json())
            .then(data => {
                setRepos(data);
                if (data.length > 0) setSelectedRepo(data[0]);
            })
            .catch(console.error);
    }, []);

    // 2. Load Files when Repo changes
    useEffect(() => {
        if (!selectedRepo) return;
        setFiles([]);
        setSelectedFilePath(null);
        setSuggestions([]);
        setActiveId(null);

        fetch(`/api/repositories/${selectedRepo.id}/files`)
            .then(res => res.json())
            .then(data => setFiles(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [selectedRepo]);

    const active = suggestions.find(s => s.id === activeId);
    const acceptedNum = suggestions.filter(s => s.accepted).length;

    const accept = async (id: number) => {
        const suggestion = suggestions.find(s => s.id === id);
        if (!suggestion) return;

        try {
            const res = await fetch('/api/tests/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: suggestion.file,
                    code: suggestion.code
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuggestions(prev => prev.map(s => s.id === id ? { ...s, accepted: true } : s));
                alert(`Test successfully written to disk at:\n${data.absolutePath}`);
            } else {
                throw new Error(data.error || 'Failed to export test');
            }
        } catch (err: unknown) {
            console.error('Export error:', err);
            const message = err instanceof Error ? err.message : String(err);
            alert(`Failed to export test: ${message}`);
        }
    };

    const handleGenerate = async () => {
        if (!selectedRepo || !selectedFilePath) return;

        setIsGenerating(true);
        setSuggestions([]);
        setActiveId(null);

        try {
            // Fetch file content
            const fileRes = await fetch(`/api/analysis/file?repositoryId=${selectedRepo.id}&path=${encodeURIComponent(selectedFilePath)}`);
            const fileData = await fileRes.json();
            const content = fileData.content || '';

            // Post to generate endpoint
            const res = await fetch('/api/tests/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: selectedFilePath,
                    content
                })
            });

            const data = await res.json();
            if (data.suggestions && Array.isArray(data.suggestions)) {
                setSuggestions(data.suggestions);
                if (data.suggestions.length > 0) {
                    setActiveId(data.suggestions[0].id);
                }
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden animate-fade-in bg-gray-950">
            {/* Header & Selectors */}
            <div className="px-8 py-6 border-b border-gray-800 bg-gray-900 flex justify-between gap-6 items-end shrink-0">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        Test Intelligence
                    </h1>
                    <p className="text-gray-400 text-sm mb-4">Auto-generated test suggestions based on structural AST analysis.</p>
                    <div className="flex gap-4 text-sm max-w-2xl">
                        <select
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 flex-1 truncate"
                            value={selectedRepo?.id || ''}
                            onChange={e => {
                                const repo = repos.find(r => r.id === e.target.value);
                                if (repo) setSelectedRepo(repo);
                            }}
                        >
                            <option value="">Select Repository...</option>
                            {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>

                        <select
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 flex-1 truncate"
                            value={selectedFilePath || ''}
                            onChange={e => setSelectedFilePath(e.target.value)}
                            disabled={files.length === 0}
                        >
                            <option value="">Select Target File...</option>
                            {files.filter(f => /\.(ts|tsx|js|jsx)$/i.test(f.path)).map(f => (
                                <option key={f.path} value={f.path}>{f.path}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedFilePath || isGenerating}
                            className={`px-5 py-2 font-medium rounded-lg transition-colors shrink-0 ${!selectedFilePath || isGenerating
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                                }`}
                        >
                            {isGenerating ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Generating...
                                </span>
                            ) : 'Generate Tests'}
                        </button>
                    </div>
                </div>
                <div className="text-right pb-1">
                    <div className="text-3xl font-bold text-emerald-400">{acceptedNum}<span className="text-gray-600 text-lg">/{suggestions.length > 0 ? suggestions.length : '-'}</span></div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Tests Accepted</div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isGenerating ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-400">Parsing AST and identifying code boundaries...</p>
                        </div>
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="text-6xl mb-6 opacity-50 text-gray-600">🧪</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Ready to Test</h2>
                        <p className="text-gray-400 text-center max-w-md">
                            Select a repository and an implementation file above, then click <strong>Generate Tests</strong> to analyze exported functions and automatically scaffold unit tests.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 h-full">
                        {/* Suggestion list */}
                        <div className="lg:col-span-2 space-y-3 overflow-y-auto custom-scrollbar pr-2 h-full">
                            {suggestions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveId(s.id)}
                                    className={`w-full text-left p-5 rounded-xl border transition-all ${activeId === s.id ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800'
                                        } ${s.accepted ? 'opacity-60 grayscale' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <span className="font-mono text-[15px] font-bold text-white break-all">{s.functionName}</span>
                                        <div className="flex gap-2 shrink-0 items-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${TYPE_BADGE[s.type]}`}>{s.type}</span>
                                            {s.accepted && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300">Accepted</span>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono bg-black/30 inline-block px-2 py-1 rounded mb-2 border border-gray-800">{s.file.split('/').pop()}</p>
                                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{s.description}</p>
                                </button>
                            ))}
                        </div>

                        {/* Code panel */}
                        <div className="lg:col-span-3 h-full flex flex-col">
                            {active ? (
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full card-glow">
                                    <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/80 backdrop-blur z-10">
                                        <div>
                                            <span className="text-lg font-bold text-white font-mono">{active.functionName}</span>
                                            <span className="text-xs font-mono text-gray-500 ml-3 py-1 px-2 border border-gray-700 rounded bg-gray-800">{active.file}</span>
                                        </div>
                                        <button
                                            onClick={() => accept(active.id)}
                                            disabled={active.accepted}
                                            className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border disabled:border-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            {active.accepted ? (
                                                <><span>✓</span> Exported to Repo</>
                                            ) : (
                                                <>Accept & Write to FS</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-gray-950">
                                        <p className="text-sm text-gray-300 mb-6 p-4 rounded-lg bg-gray-900 border border-gray-800 leading-relaxed border-l-4 border-l-violet-500">{active.description}</p>
                                        <div className="relative group">
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-1 rounded font-mono border border-gray-700 uppercase tracking-widest">{active.functionName}.test.ts</span>
                                            </div>
                                            <pre className="bg-[#0d1117] border border-gray-800 rounded-xl p-6 text-sm text-gray-300 overflow-x-auto leading-loose font-mono shadow-inner custom-scrollbar">
                                                <code className="block whitespace-pre-wrap">{active.code}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-600">
                                    Select a generated test from the list to review the code.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
