/**
 * Health Check Endpoint
 * GET /api/health
 * Returns app status and confirms Neon DB connectivity.
 */
import { NextResponse } from 'next/server';
import { sql } from '@/db/client';

export async function GET() {
    const status: {
        app: string;
        timestamp: string;
        env: { databaseUrl: string; githubToken: string };
        database: { connected: boolean; latencyMs?: number; error?: string };
    } = {
        app: 'up2code',
        timestamp: new Date().toISOString(),
        env: {
            databaseUrl: process.env.DATABASE_URL
                ? `✅ Set (${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] ?? 'host hidden'})`
                : '❌ Not set — add DATABASE_URL to .env.local',
            githubToken: process.env.GITHUB_TOKEN
                ? '✅ Set'
                : '⚠️ Not set (only needed for GitHub ingestion)',
        },
        database: { connected: false },
    };

    // Only attempt DB connection if the URL is configured
    if (!process.env.DATABASE_URL) {
        status.database = {
            connected: false,
            error: 'DATABASE_URL environment variable is missing',
        };
        return NextResponse.json(status, { status: 200 });
    }

    try {
        const start = Date.now();
        await sql`SELECT 1 AS ping`;
        status.database = {
            connected: true,
            latencyMs: Date.now() - start,
        };
        return NextResponse.json(status, { status: 200 });
    } catch (err) {
        status.database = {
            connected: false,
            error: String(err),
        };
        return NextResponse.json(status, { status: 200 });
    }
}
