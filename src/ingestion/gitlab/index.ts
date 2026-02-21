/**
 * GitLab Ingestion — stub
 */
import { config } from '@/core/config';
import { ExternalServiceError } from '@/core/errors';

async function apiFetch<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${config.gitlab.apiBase}${endpoint}`, {
        headers: { 'PRIVATE-TOKEN': config.gitlab.token },
    });
    if (!res.ok) throw new ExternalServiceError('GitLab', `${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
}

export const gitlabIngestion = {
    async listUserProjects(username: string) {
        return apiFetch<unknown[]>(`/users/${username}/projects?per_page=100`);
    },
    async getProjectTree(projectId: number, ref = 'main') {
        return apiFetch<unknown[]>(`/projects/${projectId}/repository/tree?recursive=true&ref=${ref}&per_page=100`);
    },
    async getFileContent(projectId: number, filePath: string, ref = 'main') {
        const encoded = encodeURIComponent(filePath);
        const data = await apiFetch<{ content: string; encoding: string }>(
            `/projects/${projectId}/repository/files/${encoded}?ref=${ref}`
        );
        if (data.encoding === 'base64') return Buffer.from(data.content, 'base64').toString('utf-8');
        return data.content;
    },
};
