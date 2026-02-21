'use client';

import Link from 'next/link';

const MOCK_REPOS = [
  { id: '1', name: 'auth-service', language: 'TypeScript', risk_grade: 'A', risk_score: 8, total_files: 42, frameworks: ['Express', 'JWT'], last_analysed_at: '2026-02-20T10:00:00Z' },
  { id: '2', name: 'payment-gateway', language: 'TypeScript', risk_grade: 'C', risk_score: 54, total_files: 117, frameworks: ['Next.js', 'Stripe'], last_analysed_at: '2026-02-19T08:30:00Z' },
  { id: '3', name: 'data-pipeline', language: 'Python', risk_grade: 'B', risk_score: 22, total_files: 68, frameworks: ['Django', 'Celery'], last_analysed_at: '2026-02-18T14:15:00Z' },
  { id: '4', name: 'ml-inference', language: 'Python', risk_grade: 'A', risk_score: 5, total_files: 31, frameworks: ['FastAPI'], last_analysed_at: null },
  { id: '5', name: 'legacy-portal', language: 'JavaScript', risk_grade: 'F', risk_score: 89, total_files: 312, frameworks: ['jQuery'], last_analysed_at: '2026-02-17T09:00:00Z' },
  { id: '6', name: 'mobile-api', language: 'Go', risk_grade: 'B', risk_score: 18, total_files: 55, frameworks: ['Gin'], last_analysed_at: '2026-02-20T16:45:00Z' },
];

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  B: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  C: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  D: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  F: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500/20 text-blue-300',
  JavaScript: 'bg-yellow-500/20 text-yellow-300',
  Python: 'bg-green-500/20 text-green-300',
  Go: 'bg-cyan-500/20 text-cyan-300',
  Rust: 'bg-orange-500/20 text-orange-300',
};

const STATS = [
  { label: 'Repositories', value: '6', icon: '⬡', color: 'text-violet-400' },
  { label: 'Files Analysed', value: '625', icon: '📄', color: 'text-cyan-400' },
  { label: 'Issues Found', value: '143', icon: '⚠', color: 'text-yellow-400' },
  { label: 'Avg Risk Score', value: '33', icon: '⚖', color: 'text-emerald-400' },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Repository Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Explore, analyse, and govern your codebases.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 card-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</span>
              <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Add Repo Button */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-200">Your Repositories</h2>
        <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <span>+</span> Add Repository
        </button>
      </div>

      {/* Repo cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_REPOS.map((repo) => (
          <div key={repo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-glow group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-white font-semibold group-hover:text-violet-300 transition-colors">
                  {repo.name}
                </h3>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${LANG_COLORS[repo.language] ?? 'bg-gray-700 text-gray-300'}`}>
                    {repo.language}
                  </span>
                  {repo.frameworks.map((fw) => (
                    <span key={fw} className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`ml-3 w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold shrink-0 ${GRADE_COLORS[repo.risk_grade]}`}>
                {repo.risk_grade}
              </div>
            </div>

            {/* Risk bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Risk Score</span>
                <span>{repo.risk_score}/100</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${repo.risk_score < 25 ? 'bg-emerald-500' :
                      repo.risk_score < 50 ? 'bg-yellow-500' :
                        repo.risk_score < 75 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${repo.risk_score}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{repo.total_files} files</span>
              <span>{repo.last_analysed_at ? `Analysed ${new Date(repo.last_analysed_at).toLocaleDateString()}` : 'Not yet analysed'}</span>
            </div>

            {/* Quick actions */}
            <div className="mt-4 pt-3 border-t border-gray-800 flex gap-2">
              <Link href="/explorer"
                className="flex-1 text-center text-xs py-1.5 bg-gray-800 hover:bg-violet-600 text-gray-400 hover:text-white rounded-lg transition-colors">
                Explore
              </Link>
              <Link href="/simulator"
                className="flex-1 text-center text-xs py-1.5 bg-gray-800 hover:bg-cyan-600 text-gray-400 hover:text-white rounded-lg transition-colors">
                Simulate
              </Link>
              <Link href="/governance"
                className="flex-1 text-center text-xs py-1.5 bg-gray-800 hover:bg-emerald-600 text-gray-400 hover:text-white rounded-lg transition-colors">
                Govern
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
