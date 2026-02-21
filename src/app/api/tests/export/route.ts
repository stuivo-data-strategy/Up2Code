import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { filePath, code } = await req.json();

        if (!filePath || !code) {
            return NextResponse.json({ error: 'filePath and code are required' }, { status: 400 });
        }

        // Determine destination path: strip existing extension and append .test.ts
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        const testFileName = `${name}.test.ts`;

        // Resolve absolute path assuming filePath is relative to the project root (CWD)
        const absolutePath = path.resolve(process.cwd(), dir, testFileName);

        // Ensure the directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // Write the generated test strictly to the filesystem
        await fs.writeFile(absolutePath, code, 'utf-8');

        return NextResponse.json({ success: true, absolutePath });
    } catch (err) {
        console.error('Failed to export test:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
