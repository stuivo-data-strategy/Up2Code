'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_DATA = [
    { name: 'Critical', count: 2, color: '#ef4444' },
    { name: 'High', count: 7, color: '#f97316' },
    { name: 'Medium', count: 18, color: '#eab308' },
    { name: 'Low', count: 34, color: '#22c55e' },
    { name: 'Info', count: 12, color: '#6b7280' },
];

const HEATMAP_FILES = [
    { file: 'payment.ts', security: 85, compliance: 60, complexity: 40 },
    { file: 'auth.ts', security: 30, compliance: 20, complexity: 70 },
    { file: 'legacy/api.js', security: 90, compliance: 80, complexity: 95 },
    { file: 'user.service.ts', security: 15, compliance: 30, complexity: 35 },
    { file: 'db/queries.ts', security: 60, compliance: 10, complexity: 55 },
    { file: 'utils/crypto.ts', security: 45, compliance: 5, complexity: 20 },
];

const ISSUES = [
    { id: 'SEC002', file: 'config.ts', line: 14, severity: 'critical', description: 'Hardcoded password assignment detected' },
    { id: 'SEC006', file: 'keys/private.pem', line: 1, severity: 'critical', description: 'Private key material found in source' },
    { id: 'SEC001', file: 'scripts/deploy.sh', line: 8, severity: 'high', description: 'Hardcoded AWS Access Key' },
    { id: 'GDPR001', file: 'legacy/api.js', line: 42, severity: 'high', description: 'Email address in plaintext log' },
    { id: 'SEC009', file: 'db/queries.ts', line: 23, severity: 'high', description: 'SQL string concatenation — injection risk' },
];

const SEV_BADGE: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

function heatColor(val: number) {
    if (val < 25) return 'bg-emerald-500/30';
    if (val < 50) return 'bg-yellow-500/30';
    if (val < 75) return 'bg-orange-500/30';
    return 'bg-red-500/40';
}

export default function GovernancePage() {
    const riskScore = 54;
    const grade = 'C';

    return (
        <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    Governance & Compliance
                </h1>
                <p className="text-gray-400 mt-1">Security posture, compliance checks, and risk scoring.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Risk score gauge */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow flex flex-col items-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Overall Risk Score</p>
                    <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" stroke="#1f2937" strokeWidth="10" fill="none" />
                            <circle
                                cx="50" cy="50" r="44"
                                stroke={riskScore >= 75 ? '#ef4444' : riskScore >= 50 ? '#f97316' : riskScore >= 25 ? '#eab308' : '#22c55e'}
                                strokeWidth="10" fill="none"
                                strokeDasharray={`${2.76 * riskScore} 276`}
                                strokeLinecap="round"
                                className="transition-all duration-700"
                            />
                        </svg>
                        <div className="absolute text-center">
                            <span className="text-4xl font-bold text-white">{riskScore}</span>
                            <span className="text-sm text-gray-500 block">/ 100</span>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <span className="text-5xl font-bold text-orange-400">{grade}</span>
                        <p className="text-xs text-gray-500 mt-1">Risk Grade</p>
                    </div>
                    <p className="text-sm text-gray-400 text-center mt-3 border-t border-gray-800 pt-3">
                        7 high-severity issues require review
                    </p>
                </div>

                {/* Bar chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Issues by Severity</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={SEVERITY_DATA} margin={{ left: -20 }}>
                            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {SEVERITY_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="grid grid-rows-3 gap-3">
                    {[
                        { label: 'Critical Issues', value: '2', color: 'text-red-400', bg: 'bg-red-500/10' },
                        { label: 'High Issues', value: '7', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                        { label: 'Files Reviewed', value: '312', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                    ].map((s) => (
                        <div key={s.label} className={`${s.bg} border border-gray-800 rounded-xl p-4 flex items-center justify-between`}>
                            <span className="text-sm text-gray-400">{s.label}</span>
                            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Heatmap */}
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">File Risk Heatmap</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-600 text-xs">
                                <th className="text-left pb-2 font-medium">File</th>
                                <th className="pb-2 font-medium">Security</th>
                                <th className="pb-2 font-medium">Compliance</th>
                                <th className="pb-2 font-medium">Complexity</th>
                            </tr>
                        </thead>
                        <tbody className="space-y-1">
                            {HEATMAP_FILES.map((row) => (
                                <tr key={row.file} className="border-t border-gray-800/50">
                                    <td className="py-2 text-gray-400 font-mono text-xs">{row.file}</td>
                                    {['security', 'compliance', 'complexity'].map((col) => {
                                        const val = row[col as keyof typeof row] as number;
                                        return (
                                            <td key={col} className="py-2 px-2 text-center">
                                                <span className={`inline-block w-14 py-0.5 rounded text-xs font-mono ${heatColor(val)}`}>
                                                    {val}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Issue list */}
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Actionable Issues</p>
                <div className="space-y-2">
                    {ISSUES.map((issue) => (
                        <div key={`${issue.id}-${issue.line}`} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${SEV_BADGE[issue.severity]}`}>
                                {issue.severity}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200">{issue.description}</p>
                                <p className="text-xs text-gray-600 mt-0.5 font-mono">{issue.file}:{issue.line}</p>
                            </div>
                            <span className="text-xs text-gray-600 shrink-0 font-mono">{issue.id}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
