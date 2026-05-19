'use client';

import * as Tabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsBarProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

/**
 * Glass-styled tab strip with cyan underline on active.
 * Use for cross-section navigation inside a single page (project detail tabs etc.).
 */
export function TabsBar({ items, value, onValueChange, children }: TabsBarProps) {
  return (
    <Tabs.Root value={value} onValueChange={onValueChange}>
      <Tabs.List className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-1">
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={
              'relative px-4 py-2 rounded-xl text-sm transition-colors ' +
              'text-zinc-400 hover:text-zinc-200 ' +
              'data-[state=active]:text-cyan-200 data-[state=active]:bg-cyan-500/10'
            }
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span className="ml-1.5 text-[10px] font-mono text-zinc-500">{item.count}</span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}
