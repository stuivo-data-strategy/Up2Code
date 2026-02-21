'use client';

import { useState, useEffect, useMemo } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface Repository {
    id: string;
    name: string;
}

interface RepoFile {
    path: string;
    language: string | null;
}

interface AnalysisIssue {
    file: string;
    line: number | null;
    severity: string;
    category: string;
    description: string;
    ruleId: string;
    implication?: string;
    remediation?: string;
}

export default function ExplorerPage() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    const [files, setFiles] = useState<RepoFile[]>([]);
    const [issues, setIssues] = useState<AnalysisIssue[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const [fileContent, setFileContent] = useState<string>('');
    const [loadingContent, setLoadingContent] = useState(false);

    // Initial load of repositories
    useEffect(() => {
        fetch('/api/repositories')
            .then(res => res.json())
            .then(data => {
                setRepos(data);
                if (data.length > 0) setSelectedRepo(data[0]);
            })
            .catch(console.error);
    }, []);

    // Load files and issues when a repository is selected
    useEffect(() => {
        if (!selectedRepo) return;
        setLoadingData(true);
        setSelectedFilePath(null);
        setFileContent('');

        Promise.all([
            fetch(`/api/repositories/${selectedRepo.id}/files`).then(r => r.json()),
            fetch(`/api/analysis?repositoryId=${selectedRepo.id}`).then(r => r.json())
        ])
            .then(([fetchedFiles, fetchedIssues]) => {
                setFiles(Array.isArray(fetchedFiles) ? fetchedFiles : []);
                setIssues(Array.isArray(fetchedIssues) ? fetchedIssues.flatMap((r: any) => r.results || []) : []);
            })
            .catch(console.error)
            .finally(() => setLoadingData(false));
    }, [selectedRepo]);

    // Load file content when a file is selected
    useEffect(() => {
        if (!selectedRepo || !selectedFilePath) return;
        setLoadingContent(true);
        setFileContent('');
        fetch(`/api/analysis/file?repositoryId=${selectedRepo.id}&path=${encodeURIComponent(selectedFilePath)}`)
            .then(res => res.json())
            .then(data => setFileContent(data.content || '// Failed to load content or file is empty'))
            .catch(err => setFileContent(`// Error loading file: ${String(err)}`))
            .finally(() => setLoadingContent(false));
    }, [selectedRepo, selectedFilePath]);

    // Build hierarchical tree with search filtering
    const treeNodes = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let paths = files.map(f => f.path);

        if (query) {
            paths = paths.filter(p => p.toLowerCase().includes(query));
        }

        const nodes: { path: string; type: 'dir' | 'file' }[] = [];
        const seenDirs = new Set<string>();

        paths.forEach(p => {
            const parts = p.split('/');
            let currentPath = '';
            for (let i = 0; i < parts.length - 1; i++) {
                currentPath += (i > 0 ? '/' : '') + parts[i];
                if (!seenDirs.has(currentPath)) {
                    seenDirs.add(currentPath);
                    nodes.push({ path: currentPath, type: 'dir' });
                }
            }
            nodes.push({ path: p, type: 'file' });
        });

        return nodes.sort((a, b) => {
            if (a.path === b.path) return 0;
            // Dirs before files at the same level
            const aSegments = a.path.split('/');
            const bSegments = b.path.split('/');
            for (let i = 0; i < Math.max(aSegments.length, bSegments.length); i++) {
                if (aSegments[i] !== bSegments[i]) {
                    if (aSegments[i] === undefined) return -1;
                    if (bSegments[i] === undefined) return 1;

                    const aIsDir = i < aSegments.length - 1 || a.type === 'dir';
                    const bIsDir = i < bSegments.length - 1 || b.type === 'dir';

                    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
                    return aSegments[i].localeCompare(bSegments[i]);
                }
            }
            return 0;
        });
    }, [files, searchQuery]);

    const activeIssues = useMemo(() => {
        if (!selectedFilePath) return [];
        return issues.filter(i => i.file === selectedFilePath);
    }, [issues, selectedFilePath]);

    const lineHasError = (lineNumber: number) => {
        return activeIssues.some(i => i.line === lineNumber);
    };

    const toggleDir = (path: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const breadcrumb = selectedFilePath ? selectedFilePath.split('/') : [];

    return (
        <div className="flex-1 flex h-screen overflow-hidden">
            {/* File tree sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 min-h-0">
                <div className="p-4 border-b border-gray-800 flex flex-col gap-3">
                    <select
                        className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                        value={selectedRepo?.id || ''}
                        onChange={(e) => {
                            const repo = repos.find(r => r.id === e.target.value);
                            if (repo) setSelectedRepo(repo);
                        }}
                    >
                        {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        {repos.length === 0 && <option value="">No Repositories</option>}
                    </select>

                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
                    {loadingData ? (
                        <div className="text-gray-500 text-xs text-center mt-4">Loading repository...</div>
                    ) : (
                        <ul className="text-sm font-mono text-gray-300">
                            {treeNodes.map((node) => {
                                const indent = (node.path.split('/').length - 1) * 12;
                                const isDir = node.type === 'dir';

                                // Simple path walking to check collapsed parents
                                const pathParts = node.path.split('/');
                                let isHidden = false;
                                let checkPath = '';
                                for (let i = 0; i < pathParts.length - 1; i++) {
                                    checkPath += (i > 0 ? '/' : '') + pathParts[i];
                                    if (collapsed.has(checkPath)) {
                                        isHidden = true;
                                        break;
                                    }
                                }

                                if (isHidden) return null;

                                return (
                                    <li
                                        key={node.path}
                                        style={{ paddingLeft: `${indent + 8}px` }}
                                        className={`py-1 pr-2 mt-0.5 cursor-pointer flex items-center gap-2 rounded ${selectedFilePath === node.path ? 'bg-violet-600/20 text-violet-300 font-bold' :
                                            'hover:bg-gray-800 hover:text-white text-gray-400'
                                            } transition-colors`}
                                        onClick={() => isDir ? toggleDir(node.path) : setSelectedFilePath(node.path)}
                                    >
                                        <span className="text-gray-500 text-[10px] w-3 flex justify-center shrink-0">
                                            {isDir ? (collapsed.has(node.path) ? '▶' : '▼') : '·'}
                                        </span>
                                        <span className="truncate text-[11px]">{node.path.split('/').pop()}{isDir ? '/' : ''}</span>
                                    </li>
                                );
                            })}
                            {treeNodes.length === 0 && !loadingData && (
                                <li className="text-gray-600 text-xs px-2 text-center mt-4">No matching files</li>
                            )}
                        </ul>
                    )}
                </div>
            </aside>

            {/* Code viewer */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Breadcrumb */}
                <div className="px-5 py-3 border-b border-gray-800 bg-gray-900 flex items-center gap-1 text-sm flex-wrap">
                    {breadcrumb.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-700">/</span>}
                            <span className={i === breadcrumb.length - 1 ? 'text-violet-300 font-medium' : 'text-gray-500'}>
                                {crumb}
                            </span>
                        </span>
                    ))}
                </div>

                {/* Code + issues split */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#030712]">
                    {!selectedFilePath ? (
                        <div className="flex h-full items-center justify-center text-gray-600 text-sm">
                            Select a file to view code
                        </div>
                    ) : loadingContent ? (
                        <div className="flex h-full items-center justify-center text-gray-500 text-sm animate-pulse">
                            Loading Source Code...
                        </div>
                    ) : (
                        <SyntaxHighlighter
                            language={selectedFilePath.split('.').pop() === 'ts' || selectedFilePath.split('.').pop() === 'tsx' ? 'typescript' : 'javascript'}
                            style={atomOneDark}
                            showLineNumbers
                            lineNumberStyle={{ color: '#4b5563', minWidth: '3em', paddingRight: '1em', textAlign: 'right', userSelect: 'none' }}
                            wrapLines={true}
                            lineProps={(lineNumber) => {
                                const error = lineHasError(lineNumber);
                                return {
                                    style: {
                                        display: 'block',
                                        backgroundColor: error ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                    },
                                    className: error ? 'border-r-2 border-red-500' : ''
                                };
                            }}
                            customStyle={{ margin: 0, padding: '1.5rem', background: '#030712', fontSize: '0.8rem', lineHeight: '1.5' }}
                        >
                            {fileContent}
                        </SyntaxHighlighter>
                    )}
                </div>

                {/* Issues panel */}
                <div className="border-t border-gray-800 bg-gray-900 border-b-0 h-48 flex flex-col shrink-0 min-h-0">
                    <div className="px-4 py-2 border-b border-gray-800 shrink-0 sticky top-0 bg-gray-900 z-10 flex justify-between items-center">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Analysis Hints</p>
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{activeIssues.length} total</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {activeIssues.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-xs text-gray-600 py-6">
                                No issues detected in this file.
                            </div>
                        ) : (
                            <div className="space-y-0 divide-y divide-gray-800/50">
                                {activeIssues.map((issue, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                                        <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 w-full text-center
                                                ${issue.severity === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                    issue.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                        issue.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                            issue.severity === 'low' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                                'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'}`}
                                            >
                                                {issue.severity}
                                            </span>
                                            {issue.line && <span className="text-xs font-mono text-gray-500">L{issue.line}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-200">{issue.ruleId}</span>
                                                <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded capitalize">{issue.category.toLowerCase()}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 break-words leading-snug">{issue.description}</p>

                                            {issue.implication && (
                                                <p className="text-xs text-gray-500 border-l-2 border-gray-700 pl-3 mt-1 py-0.5">
                                                    <span className="font-semibold text-gray-400">Implication:</span> {issue.implication}
                                                </p>
                                            )}
                                            {issue.remediation && (
                                                <p className="text-xs text-blue-400/80 border-l-2 border-blue-500/30 pl-3 mt-1 py-0.5">
                                                    <span className="font-semibold text-blue-400 relative">Fix:</span> {issue.remediation}
                                                </p>
                                            )}
                                            {!issue.remediation && issue.category === 'complexity' && (
                                                <p className="text-xs text-blue-400/80 border-l-2 border-blue-500/30 pl-3 mt-1 py-0.5">
                                                    <span className="font-semibold text-blue-400 relative">Fix:</span> This code structure is overly complex. Consider extracting sub-procedures to helper functions to reduce nesting and logic overhead.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
