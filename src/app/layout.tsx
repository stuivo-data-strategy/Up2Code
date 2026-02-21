import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Up2Code — Code Intelligence Platform',
  description: 'Modular, human-interactive code intelligence. Explore, analyse, simulate, and govern your codebase.',
};

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/ingest', label: 'Ingest', icon: '↓' },
  { href: '/explorer', label: 'Explorer', icon: '⌂' },
  { href: '/simulator', label: 'Simulator', icon: '▶' },
  { href: '/governance', label: 'Governance', icon: '⚖' },
  { href: '/tests', label: 'Tests', icon: '✓' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex`}>
        {/* Sidebar */}
        <nav className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-800">
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              Up2Code
            </span>
            <p className="text-xs text-gray-500 mt-0.5">Code Intelligence</p>
          </div>

          {/* Nav links */}
          <ul className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors group"
                >
                  <span className="text-gray-500 group-hover:text-violet-400 transition-colors w-5 text-center">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800">
            <p className="text-xs text-gray-600">v0.1.0 — Alpha</p>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
