'use client';

import { useState, useEffect, useRef } from 'react';

type StepType = 'function-call' | 'assignment' | 'branch' | 'loop' | 'return' | 'expression';

interface Step {
    index?: number;
    stepIndex: number;
    line: number;
    type: StepType;
    description: string;
    variables: Record<string, string>;
}

interface Repository {
    id: string;
    name: string;
}

interface RepoFile {
    path: string;
}

const STEP_COLORS: Record<StepType, string> = {
    'function-call': 'text-violet-400 bg-violet-400/10',
    'assignment': 'text-cyan-400 bg-cyan-400/10',
    'branch': 'text-yellow-400 bg-yellow-400/10',
    'loop': 'text-pink-400 bg-pink-400/10',
    'return': 'text-emerald-400 bg-emerald-400/10',
    'expression': 'text-blue-400 bg-blue-400/10',
};

export default function SimulatorPage() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    const [files, setFiles] = useState<RepoFile[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    const [fileContent, setFileContent] = useState<string>('');
    const [loadingContent, setLoadingContent] = useState(false);

    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        setFileContent('');
        setSteps([]);
        setCurrentStep(-1);
        setIsPlaying(false);

        fetch(`/api/repositories/${selectedRepo.id}/files`)
            .then(res => res.json())
            .then(data => setFiles(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [selectedRepo]);

    // 3. Load File Content and Generate Steps
    useEffect(() => {
        if (!selectedRepo || !selectedFilePath) return;

        setLoadingContent(true);
        setFileContent('');
        setSteps([]);
        setCurrentStep(-1);
        setIsPlaying(false);

        // Fetch file content
        fetch(`/api/analysis/file?repositoryId=${selectedRepo.id}&path=${encodeURIComponent(selectedFilePath)}`)
            .then(res => res.json())
            .then(data => {
                const content = data.content || '';
                setFileContent(content);

                // Now simulate to get AST steps
                return fetch('/api/simulator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create',
                        file: selectedFilePath,
                        content: content
                    })
                });
            })
            .then(res => res.json())
            .then(data => {
                if (data.steps && Array.isArray(data.steps)) {
                    setSteps(data.steps);
                } else {
                    setSteps([]);
                }
            })
            .catch(console.error)
            .finally(() => setLoadingContent(false));

    }, [selectedRepo, selectedFilePath]);

    // Playback loop
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= steps.length - 1) { setIsPlaying(false); return prev; }
                    return prev + 1;
                });
            }, 1200);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, steps.length]);

    // Auto-scroll to selected line during playback
    const step = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;

    useEffect(() => {
        if (step && step.line && isPlaying) {
            const el = document.getElementById(`sim-line-${step.line}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [step, isPlaying]);


    const lines = fileContent ? fileContent.split('\n') : [];

    const handleManualScroll = () => {
        if (isPlaying) {
            setIsPlaying(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header & Selectors */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-white mb-2">Execution Simulator <span className="text-xs text-gray-500 font-normal ml-2">F8 Engine (AST)</span></h1>
                    <div className="flex gap-3 text-sm max-w-2xl">
                        <select
                            className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:border-violet-500 flex-1 truncate"
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
                            className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:border-violet-500 flex-1 truncate"
                            value={selectedFilePath || ''}
                            onChange={e => setSelectedFilePath(e.target.value)}
                            disabled={files.length === 0}
                        >
                            <option value="">Select File to Simulate...</option>
                            {files.filter(f => /\.(ts|tsx|js|jsx)$/i.test(f.path)).map(f => (
                                <option key={f.path} value={f.path}>{f.path}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex flex-col justify-end items-end">
                    Step {Math.max(0, currentStep + 1)} / {steps.length}
                </div>
            </div>

            {/* Controls */}
            <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-3 shrink-0">
                <button onClick={() => { setCurrentStep(-1); setIsPlaying(false); }}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors">
                    ⏮ Reset
                </button>
                <button onClick={() => setCurrentStep(p => Math.max(-1, p - 1))}
                    disabled={currentStep <= -1}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors disabled:opacity-30">
                    ⏪ Back
                </button>
                <button
                    onClick={() => setIsPlaying(p => !p)}
                    disabled={steps.length === 0}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={() => setCurrentStep(p => Math.min(steps.length - 1, p + 1))}
                    disabled={currentStep >= steps.length - 1 || steps.length === 0}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors disabled:opacity-30">
                    ⏩ Step
                </button>

                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden ml-2">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${steps.length === 0 ? 0 : (currentStep < 0 ? 0 : ((currentStep + 1) / steps.length) * 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Code view with step highlighting */}
                <div
                    className="flex-1 overflow-y-auto bg-gray-950 p-5 font-mono text-sm relative custom-scrollbar"
                    onWheel={handleManualScroll}
                >
                    {!selectedFilePath ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8 bg-gray-950">
                            <div className="max-w-3xl w-full">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-bold text-white mb-4">Why use the Execution Simulator?</h2>
                                    <p className="text-gray-400 text-lg">Select a file above to visualize its runtime behavior without executing the code.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
                                        <div className="text-3xl mb-4">🧩</div>
                                        <h3 className="text-white font-semibold mb-2">Demystify Complex Logic</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Step line-by-line through highly cyclomatic functions to visualize the branching and loop paths, making dense interconnected code easier to digest.
                                        </p>
                                    </div>
                                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-cyan-500/50 transition-colors">
                                        <div className="text-3xl mb-4">🗺️</div>
                                        <h3 className="text-white font-semibold mb-2">Onboarding & Data Tracing</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Follow how data flows through an unfamiliar file (like an API handler) by watching the execution sequence structurally from entry to return.
                                        </p>
                                    </div>
                                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-red-500/50 transition-colors">
                                        <div className="text-3xl mb-4">🐛</div>
                                        <h3 className="text-white font-semibold mb-2">Bug Replication</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Build a mental model of edge cases by slowly walking through conditionals to understand how specific return paths and failure scenarios are hit.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : loadingContent ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm animate-pulse">
                            Loading Source Code and Parsing AST...
                        </div>
                    ) : (
                        <div className="pb-40 min-w-max">
                            {lines.map((lineText, i) => {
                                const lineNum = i + 1;
                                const isActive = step?.line === lineNum;
                                return (
                                    <div
                                        key={lineNum}
                                        id={`sim-line-${lineNum}`}
                                        className={`flex gap-4 px-2 py-0.5 rounded transition-colors ${isActive ? 'bg-violet-500/20 border-l-2 border-violet-500' : 'border-l-2 border-transparent hover:bg-gray-800/30'}`}
                                    >
                                        <span className={`w-10 shrink-0 select-none text-right text-[11px] ${isActive ? 'text-violet-400 font-bold' : 'text-gray-600'}`}>{lineNum}</span>
                                        <span className={`text-[11px] whitespace-pre ${isActive ? 'text-white' : 'text-gray-400'}`}>{lineText || ' '}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* State panel */}
                {selectedFilePath && (
                    <div
                        className="w-80 border-l border-gray-800 bg-gray-900 flex flex-col overflow-y-auto shrink-0 custom-scrollbar"
                        onWheel={handleManualScroll}
                    >
                        {/* Current step */}
                        <div className="p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 shrink-0 shadow-md">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-bold">Current Step</p>
                            {step ? (
                                <div>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${STEP_COLORS[step.type] || 'text-gray-400 bg-gray-800'}`}>
                                        {step.type}
                                    </span>
                                    <p className="text-sm font-medium text-white mt-2 leading-snug">{step.description}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">Line: L{step.line}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 italic">{steps.length > 0 ? 'Press Play or Step to begin' : 'Waiting for AST analysis...'}</p>
                            )}
                        </div>

                        {/* Step list */}
                        <div className="p-4 flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-bold">Execution Steps ({steps.length})</p>
                            {steps.length === 0 && !loadingContent && selectedFilePath && (
                                <p className="text-xs text-amber-500 italic mt-4">No executable steps detected by Babel AST parser in this file.</p>
                            )}
                            <div className="space-y-1">
                                {steps.map((s, idx) => (
                                    <button
                                        key={`step-${idx}-${s.line}`}
                                        onClick={() => setCurrentStep(idx)}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex gap-2 items-center ${currentStep === idx ? 'bg-violet-600/30 text-violet-300 font-medium' :
                                            currentStep > idx ? 'text-gray-500' : 'text-gray-600 hover:text-gray-300 hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-[10px] font-mono shrink-0 w-8 text-right opacity-50">L{s.line}</span>
                                        <span className="truncate flex-1">{s.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
