import { NextResponse } from 'next/server';
import { simulatorEngine } from '@/simulator/engine';

export async function POST(req: Request) {
    try {
        const { file, content, action, session } = await req.json();

        if (action === 'create') {
            const newSession = simulatorEngine.createSession('repo-id', file);
            const steps = simulatorEngine.generateSteps(file, content);
            return NextResponse.json({ ...newSession, steps });
        }

        if (!session) return NextResponse.json({ error: 'session required' }, { status: 400 });

        if (action === 'step-forward') return NextResponse.json(simulatorEngine.stepForward(session));
        if (action === 'step-back') return NextResponse.json(simulatorEngine.stepBack(session));
        if (action === 'play') return NextResponse.json(simulatorEngine.play(session));
        if (action === 'pause') return NextResponse.json(simulatorEngine.pause(session));

        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
