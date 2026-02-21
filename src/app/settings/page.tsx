'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [dbUrl, setDbUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [gitlabToken, setGitlabToken] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="flex-1 p-8 max-w-3xl animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    Settings
                </h1>
                <p className="text-gray-400 mt-1">Configure connections, tokens, and platform preferences.</p>
            </div>

            <div className="space-y-6">
                {/* Neon DB */}
                <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                    <h2 className="text-base font-semibold text-white mb-1">Neon Database</h2>
                    <p className="text-xs text-gray-500 mb-4">Connect your Neon PostgreSQL instance. Find your connection string in the Neon console.</p>
                    <label className="block text-xs text-gray-400 mb-1">Connection String</label>
                    <input
                        type="password"
                        value={dbUrl}
                        onChange={e => setDbUrl(e.target.value)}
                        placeholder="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">Set as DATABASE_URL in your .env.local file for local development.</p>
                </section>

                {/* GitHub */}
                <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                    <h2 className="text-base font-semibold text-white mb-1">GitHub Integration</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Required for importing private repositories. Create a token at <span className="text-violet-400">github.com/settings/tokens</span>.
                    </p>
                    <label className="block text-xs text-gray-400 mb-1">Personal Access Token</label>
                    <input
                        type="password"
                        value={githubToken}
                        onChange={e => setGithubToken(e.target.value)}
                        placeholder="ghp_••••••••••••••••"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                    />
                </section>

                {/* GitLab */}
                <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                    <h2 className="text-base font-semibold text-white mb-1">GitLab Integration</h2>
                    <p className="text-xs text-gray-500 mb-4">Personal access token for importing GitLab repositories.</p>
                    <label className="block text-xs text-gray-400 mb-1">Personal Access Token</label>
                    <input
                        type="password"
                        value={gitlabToken}
                        onChange={e => setGitlabToken(e.target.value)}
                        placeholder="glpat-••••••••••••••••"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                    />
                </section>

                {/* Feature flags */}
                <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 card-glow">
                    <h2 className="text-base font-semibold text-white mb-4">Feature Flags</h2>
                    <div className="space-y-3">
                        {[
                            { label: 'Execution Simulator', key: 'simulator', enabled: true },
                            { label: 'Governance Engine', key: 'governance', enabled: true },
                            { label: 'Test Generation', key: 'tests', enabled: true },
                            { label: 'Behavioural Narrator', key: 'narrator', enabled: true },
                        ].map(f => (
                            <div key={f.key} className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">{f.label}</span>
                                <div className={`w-10 h-5 rounded-full transition-colors ${f.enabled ? 'bg-violet-600' : 'bg-gray-700'} relative cursor-pointer`}>
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Save button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Save Settings
                    </button>
                    {saved && <span className="text-sm text-emerald-400 animate-fade-in">✓ Settings saved</span>}
                </div>
            </div>
        </div>
    );
}
