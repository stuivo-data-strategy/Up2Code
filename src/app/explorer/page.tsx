'use client';

import { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const MOCK_TREE = [
    { path: 'src/', type: 'dir' },
    { path: 'src/app/', type: 'dir' },
    { path: 'src/app/page.tsx', type: 'file', lang: 'typescript' },
    { path: 'src/app/layout.tsx', type: 'file', lang: 'typescript' },
    { path: 'src/core/', type: 'dir' },
    { path: 'src/core/config/index.ts', type: 'file', lang: 'typescript' },
    { path: 'src/core/logger/index.ts', type: 'file', lang: 'typescript' },
    { path: 'src/analysis/', type: 'dir' },
    { path: 'src/analysis/security/index.ts', type: 'file', lang: 'typescript' },
    { path: 'src/analysis/complexity/index.ts', type: 'file', lang: 'typescript' },
    { path: 'src/simulator/', type: 'dir' },
    { path: 'src/simulator/engine/index.ts', type: 'file', lang: 'typescript' },
];

const MOCK_FILE_CONTENT = `// src/core/config/index.ts
export const config = {
  app: {
    name: 'Up2Code',
    version: '0.1.0',
    env: process.env.NODE_ENV ?? 'development',
  },
  db: {
    neonConnectionString: process.env.DATABASE_URL ?? '',
  },
  github: {
    token: process.env.GITHUB_TOKEN ?? '',
    apiBase: 'https://api.github.com',
  },
  features: {
    enableSimulator: true,
    enableGovernance: true,
    enableTestGeneration: true,
  },
} as const;`;

const MOCK_ISSUES = [
    { line: 12, type: 'refactor', text: 'Consider using a config schema validator (e.g., zod)', severity: 'low' },
    { line: 3, type: 'info', text: 'Environment variable pattern detected — verify .env.local is gitignored', severity: 'info' },
];

export default function ExplorerPage() {
    const [selectedFile, setSelectedFile] = useState('src/core/config/index.ts');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const breadcrumb = selectedFile.split('/');

    const toggleDir = (path: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const dirs = MOCK_TREE.filter(n => n.type === 'dir').map(n => n.path);

    return (
        <div className="flex-1 flex h-screen overflow-hidden">
            {/* File tree sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto shrink-0">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Files</span>
                    <span className="text-xs text-gray-500">{MOCK_TREE.filter(n => n.type === 'file').length} files</span>
                </div>
                <ul className="py-2 text-sm">
                    {MOCK_TREE.map((node) => {
                        const indent = (node.path.split('/').length - 1) * 12;
                        const isDir = node.type === 'dir';
                        const parentDir = node.path.replace(/[^/]+\/?$/, '');
                        if (isDir && parentDir && collapsed.has(parentDir)) return null;
                        if (!isDir && collapsed.has(node.path.replace(/[^/]+$/, ''))) return null;

                        return (
                            <li
                                key={node.path}
                                style={{ paddingLeft: `${indent + 12}px` }}
                                className={`py-1 pr-3 cursor-pointer flex items-center gap-2 rounded mx-1 ${selectedFile === node.path ? 'bg-violet-600/20 text-violet-300' :
                                        'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                    } transition-colors`}
                                onClick={() => isDir ? toggleDir(node.path) : setSelectedFile(node.path)}
                            >
                                <span className="text-gray-600 text-xs shrink-0">
                                    {isDir ? (collapsed.has(node.path) ? '▶' : '▼') : '·'}
                                </span>
                                <span className="truncate">{node.path.split('/').filter(Boolean).pop()}{isDir ? '/' : ''}</span>
                            </li>
                        );
                    })}
                </ul>
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
                <div className="flex-1 overflow-y-auto">
                    <SyntaxHighlighter
                        language="typescript"
                        style={atomOneDark}
                        showLineNumbers
                        lineNumberStyle={{ color: '#4b5563', minWidth: '2.5em' }}
                        customStyle={{ margin: 0, padding: '1.5rem', background: '#030712', fontSize: '0.8rem', lineHeight: '1.6' }}
                        wrapLongLines={false}
                    >
                        {MOCK_FILE_CONTENT}
                    </SyntaxHighlighter>
                </div>

                {/* Issues panel */}
                <div className="border-t border-gray-800 bg-gray-900 p-3">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Analysis — {MOCK_ISSUES.length} hints</p>
                    <div className="space-y-1">
                        {MOCK_ISSUES.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                <span className={`shrink-0 mt-0.5 ${issue.severity === 'low' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                    {issue.severity === 'low' ? '⚠' : 'ℹ'}
                                </span>
                                <span><span className="text-gray-500">L{issue.line}</span> — {issue.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
