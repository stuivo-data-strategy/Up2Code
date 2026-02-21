/**
 * GitHub Ingestion Module
 * Fetches repository structure and file contents from GitHub API.
 */
import { config } from '@/core/config';
import { ExternalServiceError } from '@/core/errors';
import { logger } from '@/core/logger';

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    default_branch: string;
    stargazers_count: number;
    updated_at: string;
    clone_url: string;
}

export interface GitHubTreeItem {
    path: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
}

function getAuthHeaders(): Record<string, string> {
    const token = config.github.token;
    // Only attach auth header if a real token is configured (not a placeholder)
    const isRealToken = token && token.length > 10 && !token.startsWith('ghp_your');
    return {
        ...(isRealToken ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

async function apiFetch<T>(endpoint: string): Promise<T> {
    const url = `${config.github.apiBase}${endpoint}`;
    const res = await fetch(url, {
        headers: getAuthHeaders(),
        next: { revalidate: 60 },
    });
    if (!res.ok) {
        throw new ExternalServiceError('GitHub', `${res.status} ${res.statusText} — ${endpoint}`);
    }
    return res.json() as Promise<T>;
}

export const githubIngestion = {
    async listUserRepos(username: string): Promise<GitHubRepo[]> {
        logger.info('GitHub: listing repos', { username });
        return apiFetch<GitHubRepo[]>(`/users/${username}/repos?per_page=100&sort=updated`);
    },

    async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
        logger.info('GitHub: get repo', { owner, repo });
        return apiFetch<GitHubRepo>(`/repos/${owner}/${repo}`);
    },

    async getTree(owner: string, repo: string, branch = 'main'): Promise<GitHubTreeItem[]> {
        logger.info('GitHub: get tree', { owner, repo, branch });
        const data = await apiFetch<{ tree: GitHubTreeItem[] }>(
            `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
        );
        return data.tree;
    },

    async getFileContent(owner: string, repo: string, path: string): Promise<string> {
        logger.info('GitHub: get file', { owner, repo, path });
        const data = await apiFetch<{ content: string; encoding: string }>(
            `/repos/${owner}/${repo}/contents/${path}`
        );
        if (data.encoding === 'base64') {
            return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
        }
        return data.content;
    },
};
