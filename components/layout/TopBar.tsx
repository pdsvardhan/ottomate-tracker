// TopBar — health badge + cmdk palette trigger.

import { PaletteHost } from '@/components/cmdk/PaletteHost';

export function TopBar() {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6 gap-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">Ottomate</div>
      <div className="flex items-center gap-3">
        <PaletteHost />
        <span className="text-xs text-zinc-500 inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          tracker live
        </span>
      </div>
    </header>
  );
}
