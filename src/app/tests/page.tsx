'use client';

import { useState } from 'react';

const SUGGESTIONS = [
    {
        id: 1, functionName: 'verifyToken', file: 'src/auth.ts', type: 'unit',
        description: 'Unit tests for verifyToken — handles valid token, expired token, and malformed input.',
        code: `describe('verifyToken', () => {
  it('should return user for a valid token', async () => {
    const token = signToken('usr_123');
    const user = await verifyToken(token);
    expect(user?.id).toBe('usr_123');
  });

  it('should throw for an invalid token', async () => {
    await expect(verifyToken('invalid')).rejects.toThrow();
  });

  it('should throw when token is empty', async () => {
    await expect(verifyToken('')).rejects.toThrow('Token is required');
  });
});`,
        accepted: false,
    },
    {
        id: 2, functionName: 'calculateRiskScore', file: 'src/governance/scoring/index.ts', type: 'unit',
        description: 'Unit tests for risk scorer — tests grade boundaries and issue weighting.',
        code: `describe('governanceScorer', () => {
  it('should return grade A for zero issues', () => {
    const result = governanceScorer.calculate([], 10);
    expect(result.grade).toBe('A');
    expect(result.score).toBeLessThan(10);
  });

  it('should return grade F for critical issues', () => {
    const criticals = Array(5).fill({ severity: 'critical' });
    const result = governanceScorer.calculate(criticals, 1);
    expect(result.grade).toBe('F');
  });
});`,
        accepted: false,
    },
    {
        id: 3, functionName: 'metadataExtractor.extractFromPaths', file: 'src/ingestion/metadata/index.ts', type: 'unit',
        description: 'Tests language detection and framework fingerprinting from file paths.',
        code: `describe('metadataExtractor', () => {
  it('should detect TypeScript as primary language', () => {
    const paths = ['src/app.ts', 'src/utils.ts', 'README.md'];
    const result = metadataExtractor.extractFromPaths(paths);
    expect(result.primaryLanguage).toBe('TypeScript');
  });

  it('should detect Next.js framework', () => {
    const paths = ['next.config.ts', 'src/app/page.tsx'];
    const result = metadataExtractor.extractFromPaths(paths);
    expect(result.frameworks).toContain('Next.js');
  });
});`,
        accepted: false,
    },
];

type TestType = 'unit' | 'integration' | 'edge';

const TYPE_BADGE: Record<TestType, string> = {
    unit: 'bg-violet-500/20 text-violet-300',
    integration: 'bg-cyan-500/20 text-cyan-300',
    edge: 'bg-yellow-500/20 text-yellow-300',
};

export default function TestsPage() {
    const [suggestions, setSuggestions] = useState(SUGGESTIONS);
    const [activeId, setActiveId] = useState<number | null>(1);

    const active = suggestions.find(s => s.id === activeId);
    const accepted = suggestions.filter(s => s.accepted).length;

    const accept = (id: number) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, accepted: true } : s));
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        Test Intelligence
                    </h1>
                    <p className="text-gray-400 mt-1">Auto-generated test suggestions based on inferred behaviour.</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">{accepted}/{suggestions.length}</div>
                    <div className="text-xs text-gray-500">Tests Accepted</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Suggestion list */}
                <div className="lg:col-span-2 space-y-3">
                    {suggestions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveId(s.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${activeId === s.id ? 'border-violet-500 bg-violet-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                                } ${s.accepted ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="font-mono text-sm text-white">{s.functionName}</span>
                                <div className="flex gap-1 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_BADGE[s.type as TestType]}`}>{s.type}</span>
                                    {s.accepted && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">✓</span>}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{s.file}</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.description}</p>
                        </button>
                    ))}
                </div>

                {/* Code panel */}
                {active && (
                    <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden card-glow">
                        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-white">{active.functionName}</span>
                                <span className="text-xs text-gray-500 ml-2">{active.file}</span>
                            </div>
                            <button
                                onClick={() => accept(active.id)}
                                disabled={active.accepted}
                                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                            >
                                {active.accepted ? '✓ Accepted' : 'Accept & Export'}
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-400 mb-3">{active.description}</p>
                            <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed">
                                <code>{active.code}</code>
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
