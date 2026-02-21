'use client';

import { useState, useEffect, useRef } from 'react';

const DEMO_SOURCE = `// auth.ts — JWT authentication
import jwt from 'jsonwebtoken';
import { config } from '@/core/config';

export async function verifyToken(token: string) {
  if (!token) {
    throw new Error('Token is required');
  }

  const secret = config.auth.sessionSecret;
  const decoded = jwt.verify(token, secret);

  if (!decoded) {
    return null;
  }

  const user = await db.findUser(decoded.sub);
  return user;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.auth.sessionSecret, {
    expiresIn: '7d',
  });
}`;

type StepType = 'function-call' | 'assignment' | 'branch' | 'return' | 'expression';

interface Step {
    index: number;
    line: number;
    type: StepType;
    description: string;
    variables: Record<string, string>;
}

const STEPS: Step[] = [
    { index: 0, line: 4, type: 'function-call', description: 'Enter verifyToken(token)', variables: { token: '"eyJhbG..."' } },
    { index: 1, line: 5, type: 'branch', description: 'Evaluate: if (!token)', variables: { token: '"eyJhbG..."' } },
    { index: 2, line: 9, type: 'assignment', description: 'Assign: secret = config.auth.sessionSecret', variables: { token: '"eyJhbG..."', secret: '"[REDACTED]"' } },
    { index: 3, line: 10, type: 'assignment', description: 'Assign: decoded = jwt.verify(token, secret)', variables: { token: '"eyJhbG..."', secret: '"[REDACTED]"', decoded: '{ sub: "usr_123", iat: 1708000000 }' } },
    { index: 4, line: 12, type: 'branch', description: 'Evaluate: if (!decoded)', variables: { token: '"eyJhbG..."', decoded: '{ sub: "usr_123" }' } },
    { index: 5, line: 16, type: 'expression', description: 'Call db.findUser(decoded.sub)', variables: { decoded: '{ sub: "usr_123" }', userId: '"usr_123"' } },
    { index: 6, line: 17, type: 'return', description: 'Return user object', variables: { user: '{ id: "usr_123", email: "alex@..." }' } },
];

const STEP_COLORS: Record<StepType, string> = {
    'function-call': 'text-violet-400 bg-violet-400/10',
    'assignment': 'text-cyan-400 bg-cyan-400/10',
    'branch': 'text-yellow-400 bg-yellow-400/10',
    'return': 'text-emerald-400 bg-emerald-400/10',
    'expression': 'text-blue-400 bg-blue-400/10',
};

export default function SimulatorPage() {
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const step = currentStep >= 0 ? STEPS[currentStep] : null;

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= STEPS.length - 1) { setIsPlaying(false); return prev; }
                    return prev + 1;
                });
            }, 1200);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying]);

    const lines = DEMO_SOURCE.split('\n');

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-white">Execution Simulator <span className="text-xs text-gray-500 font-normal ml-2">F8 Engine</span></h1>
                    <p className="text-xs text-gray-500">auth.ts → verifyToken()</p>
                </div>
                <div className="text-xs text-gray-500">
                    Step {Math.max(0, currentStep + 1)} / {STEPS.length}
                </div>
            </div>

            {/* Controls */}
            <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-3">
                <button onClick={() => { setCurrentStep(-1); setIsPlaying(false); }}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors">
                    ⏮ Reset
                </button>
                <button onClick={() => setCurrentStep(p => Math.max(-1, p - 1))}
                    disabled={currentStep <= -1}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors disabled:opacity-30">
                    ⏪ Back
                </button>
                <button
                    onClick={() => setIsPlaying(p => !p)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={() => setCurrentStep(p => Math.min(STEPS.length - 1, p + 1))}
                    disabled={currentStep >= STEPS.length - 1}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors disabled:opacity-30">
                    ⏩ Step
                </button>

                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden ml-2">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${currentStep < 0 ? 0 : ((currentStep + 1) / STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Code view with step highlighting */}
                <div className="flex-1 overflow-y-auto bg-gray-950 p-5 font-mono text-sm">
                    {lines.map((line, i) => {
                        const lineNum = i + 1;
                        const isActive = step?.line === lineNum;
                        return (
                            <div
                                key={i}
                                className={`flex gap-4 px-2 py-0.5 rounded transition-colors ${isActive ? 'bg-violet-500/20 border-l-2 border-violet-500' : 'border-l-2 border-transparent'}`}
                            >
                                <span className="text-gray-700 w-6 shrink-0 select-none text-right">{lineNum}</span>
                                <span className={isActive ? 'text-white' : 'text-gray-400'}>{line || ' '}</span>
                            </div>
                        );
                    })}
                </div>

                {/* State panel */}
                <div className="w-72 border-l border-gray-800 bg-gray-900 flex flex-col overflow-y-auto shrink-0">
                    {/* Current step */}
                    <div className="p-4 border-b border-gray-800">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Step</p>
                        {step ? (
                            <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STEP_COLORS[step.type]}`}>
                                    {step.type}
                                </span>
                                <p className="text-sm text-gray-300 mt-2">{step.description}</p>
                                <p className="text-xs text-gray-600 mt-1">Line {step.line}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 italic">Press Play or Step to begin</p>
                        )}
                    </div>

                    {/* Variable state */}
                    <div className="p-4 border-b border-gray-800">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Variable State</p>
                        {step && Object.keys(step.variables).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(step.variables).map(([name, value]) => (
                                    <div key={name} className="bg-gray-800 rounded-lg p-2">
                                        <span className="text-cyan-400 text-xs font-mono">{name}</span>
                                        <p className="text-xs text-gray-400 mt-0.5 font-mono break-all">{value}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-600 italic">No variables in scope</p>
                        )}
                    </div>

                    {/* Step list */}
                    <div className="p-4 flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Execution Path</p>
                        <div className="space-y-1">
                            {STEPS.map((s) => (
                                <button
                                    key={s.index}
                                    onClick={() => setCurrentStep(s.index)}
                                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${currentStep === s.index ? 'bg-violet-600/30 text-violet-300' :
                                            currentStep > s.index ? 'text-gray-600' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="text-gray-700 mr-2">L{s.line}</span>
                                    {s.description.substring(0, 35)}…
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
