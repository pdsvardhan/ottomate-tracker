// KeyContextPanel — 3-column glass cards showing must_haves / non_goals / preferences.
// Pulled from projects.preferences JSON + project_non_goals + project_success_criteria.

interface KeyContextProps {
  must_haves: string[];
  non_goals: string[];
  likes: string[];
  dislikes: string[];
  success_criteria: string[];
}

function Card({ title, items, tone }: { title: string; items: string[]; tone: 'cyan' | 'rose' | 'violet' | 'emerald' }) {
  const titleColor =
    tone === 'cyan' ? 'text-cyan-300'
    : tone === 'rose' ? 'text-rose-300'
    : tone === 'violet' ? 'text-violet-300'
    : 'text-emerald-300';
  const dotColor =
    tone === 'cyan' ? 'bg-cyan-400'
    : tone === 'rose' ? 'bg-rose-400'
    : tone === 'violet' ? 'bg-violet-400'
    : 'bg-emerald-400';

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <h3 className={'text-sm font-semibold mb-3 ' + titleColor}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">— none specified —</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
              <span className={'mt-1.5 size-1 rounded-full shrink-0 ' + dotColor} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function KeyContextPanel(props: KeyContextProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card title="Must-haves" items={props.must_haves} tone="cyan" />
      <Card title="Non-goals" items={props.non_goals} tone="rose" />
      <Card title="Success criteria" items={props.success_criteria} tone="emerald" />
      <Card title="Likes" items={props.likes} tone="cyan" />
      <Card title="Dislikes" items={props.dislikes} tone="rose" />
    </div>
  );
}
