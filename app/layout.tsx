import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { TokenInjector } from '@/components/auth/TokenInjector';
import { getServerToken } from '@/lib/token';

export const metadata: Metadata = {
  title: "Ottomate",
  description: 'Ottomate manages your web project pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = getServerToken();
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <TokenInjector token={token} />
        <div className="flex min-h-screen">
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
