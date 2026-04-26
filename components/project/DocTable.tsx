// Generic table for per-doc list views. Server-component friendly.

type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export function DocTable<T extends { id?: string | number }>({
  columns,
  rows,
  emptyLabel,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`text-left px-4 py-3 font-medium ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t border-zinc-800 hover:bg-zinc-900/40">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ value, scheme }: { value: string | null | undefined; scheme: 'flow' | 'feature' | 'risk' }) {
  const map: Record<string, string> = {
    'passing': 'bg-emerald-950/40 text-emerald-300 border-emerald-900',
    'partial': 'bg-amber-950/40 text-amber-300 border-amber-900',
    'failing': 'bg-rose-950/40 text-rose-300 border-rose-900',
    'not-tested': 'bg-zinc-900 text-zinc-500 border-zinc-800',
    'planned': 'bg-zinc-900 text-zinc-500 border-zinc-800',
    'building': 'bg-cyan-950/40 text-cyan-300 border-cyan-900',
    'done': 'bg-emerald-950/40 text-emerald-300 border-emerald-900',
    'blocked': 'bg-rose-950/40 text-rose-300 border-rose-900',
    'dropped': 'bg-zinc-950 text-zinc-600 border-zinc-900',
    'open': 'bg-amber-950/40 text-amber-300 border-amber-900',
    'accepted': 'bg-zinc-900 text-zinc-300 border-zinc-700',
    'resolved': 'bg-emerald-950/40 text-emerald-300 border-emerald-900',
  };
  const cls = map[value ?? ''] ?? 'bg-zinc-900 text-zinc-500 border-zinc-800';
  return (
    <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${cls}`}>
      {value ?? '—'}
    </span>
  );
}
