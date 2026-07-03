import type { Metadata } from 'next';
import { Archivo, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';
import { TokenInjector } from '@/components/auth/TokenInjector';
import { getServerToken } from '@/lib/token';

// Prototype type system — self-hosted at build (no runtime CDN).
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' });
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Ottomate',
  description: 'Ottomate manages your web project pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = getServerToken();
  return (
    <html lang="en" className={`dark ${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body className="text-zinc-100 min-h-screen antialiased">
        {/* Ambient background: dot grid + two soft aurora blobs. Pure CSS. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute -top-32 left-[15%] h-[460px] w-[460px] rounded-full bg-cyan-500/[0.06] blur-[140px]" />
          <div className="absolute top-[35%] right-[10%] h-[420px] w-[420px] rounded-full bg-violet-500/[0.05] blur-[140px]" />
        </div>

        <TokenInjector token={token} />
        <div className="relative z-10 flex min-h-screen flex-col">
          <TopNav />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
