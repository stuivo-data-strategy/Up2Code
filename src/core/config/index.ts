/**
 * Core Configuration Module
 * Centralises all environment-based config for Up2Code.
 */

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
    gitlab: {
        token: process.env.GITLAB_TOKEN ?? '',
        apiBase: 'https://gitlab.com/api/v4',
    },
    auth: {
        sessionSecret: process.env.SESSION_SECRET ?? 'change-me-in-production',
        sessionMaxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    },
    features: {
        enableSimulator: true,
        enableGovernance: true,
        enableTestGeneration: true,
        enableNarrator: true,
    },
} as const;

export type AppConfig = typeof config;
