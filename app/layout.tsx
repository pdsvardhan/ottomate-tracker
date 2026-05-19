import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { TokenInjector } from '@/components/auth/TokenInjector';
import { getServerToken } from '@/lib/token';

export const metadata: Metadata = {
  title: 'Ottomate',
  description: 'Ottomate manages your web project pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = getServerToken();
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {/*
          Spotlight Glass background (iteration #5).
          Fixed layer rendered behind every route: dot pattern + cyan/violet aurora blobs.
          Pure CSS — no JS, no animation lib.
        */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute -top-32 left-[15%] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-[140px]" />
          <div className="absolute top-[35%] right-[10%] h-[420px] w-[420px] rounded-full bg-violet-500/10 blur-[140px]" />
        </div>

        <TokenInjector token={token} />
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
