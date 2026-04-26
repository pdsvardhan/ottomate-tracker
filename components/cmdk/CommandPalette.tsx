// Global Cmd+K command palette. Opens from anywhere; jumps to projects,
// pages, or runs commands like "Pack up <slug>" / "Resolve risk N".

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';

type Project = { slug: string; display_name: string };
type Iteration = { id: number; project_slug: string; iteration_number: number; status: string | null };

interface Props {
  projects: Project[];
}

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Projects', href: '/' },
  { label: 'Bug Inbox', href: '/inbox' },
  { label: 'Coverage Dashboard', href: '/coverage' },
  { label: 'Risk Heatmap', href: '/risks' },
  { label: 'Components', href: '/components-browser' },
  { label: 'Search', href: '/search' },
];

export function CommandPalette({ projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Fetch iterations once when palette first opens
  useEffect(() => {
    if (!open || iterations.length > 0) return;
    void fetch('/api/inbox?status=classified')
      .then((r) => r.ok ? r.json() : { reports: [] })
      .catch(() => ({ reports: [] }));
  }, [open, iterations.length]);

  function go(href: string) {
    startTransition(() => {
      setOpen(false);
      setSearch('');
      router.push(href);
    });
  }

  return (
    <>
      {/* Hint chip */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/40"
      >
        <span>Search</span>
        <kbd className="text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto mt-24 max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Command Menu" shouldFilter loop>
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type to search…"
                autoFocus
                className="w-full bg-transparent border-0 border-b border-zinc-800 px-5 py-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-zinc-500">
                  No matches.
                </Command.Empty>

                <Command.Group heading="Navigate" className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-1">
                  {NAV_LINKS.map((n) => (
                    <Command.Item
                      key={n.href}
                      value={`navigate ${n.label}`}
                      onSelect={() => go(n.href)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-cyan-300"
                    >
                      → {n.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                {projects.length > 0 && (
                  <Command.Group heading="Projects" className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-1 mt-2">
                    {projects.map((p) => (
                      <Command.Item
                        key={p.slug}
                        value={`project ${p.display_name} ${p.slug}`}
                        onSelect={() => go(`/projects/${p.slug}`)}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-cyan-300"
                      >
                        <span>{p.display_name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{p.slug}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Open in new tab" className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-1 mt-2">
                  <Command.Item
                    value="search jump"
                    onSelect={() => go(`/search?q=${encodeURIComponent(search)}`)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-cyan-300"
                  >
                    🔎 Full-text search for &ldquo;{search || '…'}&rdquo;
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="border-t border-zinc-800 px-4 py-2 flex justify-between text-[10px] text-zinc-600">
                <span><kbd className="font-mono">↑↓</kbd> nav · <kbd className="font-mono">⏎</kbd> select · <kbd className="font-mono">esc</kbd> close</span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
