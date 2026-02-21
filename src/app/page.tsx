'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Repository {
  id: string;
  name: string;
  full_name: string | null;
  description: string | null;
  source: string;
  source_url: string | null;
  primary_language: string | null;
  frameworks: string[];
  total_files: number;
  risk_score: number;
  risk_grade: string;
  last_analysed_at: string | null;
  created_at: string;
}

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

const SOURCE_ICONS: Record<string, string> = {
  github: '⬡',
  gitlab: '⬡',
  local: '📁',
  zip: '📦',
};

function AddRepoModal({ onClose, onCreated }: { onClose: () => void; onCreated: (repo: Repository) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('github');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Repository name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), source_url: url.trim() || null, source, description: description.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create');
      const repo = await res.json();
      onCreated(repo);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Add Repository</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Source</label>
            <div className="flex gap-2">
              {['github', 'gitlab', 'local', 'zip'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${source === s
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Repository Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-project"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* URL */}
          {(source === 'github' || source === 'gitlab') && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                {source === 'github' ? 'GitHub URL' : 'GitLab URL'}
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={source === 'github' ? 'https://github.com/owner/repo' : 'https://gitlab.com/owner/repo'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono text-xs"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description <span className="text-gray-600">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this codebase do?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? 'Adding…' : 'Add Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl mb-4">⬡</div>
      <h3 className="text-lg font-semibold text-white mb-2">No repositories yet</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Add your first repository to start analysing code, running security scans, and exploring your codebase.
      </p>
      <button onClick={onAdd}
        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
        + Add Repository
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchRepos = useCallback(async () => {
    try {
      setError('');
      const res = await fetch('/api/repositories');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load');
      setRepos(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this repository?')) return;
    await fetch(`/api/repositories?id=${id}`, { method: 'DELETE' });
    setRepos(prev => prev.filter(r => r.id !== id));
  };

  const stats = [
    { label: 'Repositories', value: repos.length.toString(), icon: '⬡', color: 'text-violet-400' },
    { label: 'Files Indexed', value: repos.reduce((s, r) => s + r.total_files, 0).toString(), icon: '📄', color: 'text-cyan-400' },
    { label: 'Analysed', value: repos.filter(r => r.last_analysed_at).length.toString(), icon: '✓', color: 'text-emerald-400' },
    { label: 'Avg Risk', value: repos.length ? Math.round(repos.reduce((s, r) => s + r.risk_score, 0) / repos.length).toString() : '—', icon: '⚖', color: 'text-yellow-400' },
  ];

  return (
    <div className="flex-1 p-8 animate-fade-in overflow-y-auto">
      {showModal && (
        <AddRepoModal
          onClose={() => setShowModal(false)}
          onCreated={(repo) => setRepos(prev => [repo, ...prev])}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Repository Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Explore, analyse, and govern your codebases.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 card-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</span>
              <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <span className={`text-3xl font-bold ${stat.color}`}>{loading ? '…' : stat.value}</span>
          </div>
        ))}
      </div>

      {/* Repo list header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-200">Repositories</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <span>+</span> Add Repository
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && repos.length === 0 && (
        <EmptyState onAdd={() => setShowModal(true)} />
      )}

      {/* Repo cards */}
      {!loading && repos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div key={repo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 card-glow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">{SOURCE_ICONS[repo.source] ?? '⬡'}</span>
                    <h3 className="text-white font-semibold truncate group-hover:text-violet-300 transition-colors">
                      {repo.name}
                    </h3>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{repo.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {repo.primary_language && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LANG_COLORS[repo.primary_language] ?? 'bg-gray-700 text-gray-300'}`}>
                        {repo.primary_language}
                      </span>
                    )}
                    {(repo.frameworks ?? []).map((fw) => (
                      <span key={fw} className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{fw}</span>
                    ))}
                    {!repo.primary_language && (repo.frameworks ?? []).length === 0 && (
                      <span className="text-xs text-gray-600 italic">Not yet analysed</span>
                    )}
                  </div>
                </div>
                <div className={`ml-3 w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold shrink-0 ${GRADE_COLORS[repo.risk_grade] ?? GRADE_COLORS.A}`}>
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
                    style={{ width: `${Math.max(2, repo.risk_score)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{repo.total_files} files</span>
                <span>{repo.last_analysed_at ? `Analysed ${new Date(repo.last_analysed_at).toLocaleDateString()}` : 'Not yet analysed'}</span>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-800 flex gap-2">
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
                <button
                  onClick={() => handleDelete(repo.id)}
                  className="px-2 py-1.5 bg-gray-800 hover:bg-red-600/30 text-gray-600 hover:text-red-400 rounded-lg transition-colors text-xs"
                  title="Remove repository"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
