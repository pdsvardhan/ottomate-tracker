// Compact "About this project" block — one glass panel, sections inline.
// Replaces the 5 separate KeyContextPanel cards.

import { Badge } from '@/components/ui/Badge';

interface AboutProps {
  tagline: string | null;
  must_haves: string[];
  non_goals: string[];
  success_criteria: string[];
  likes: string[];
  dislikes: string[];
  avoid: string[];
}

function Row({ label, items, tone, asBadges }: { label: string; items: string[]; tone: 'cyan' | 'rose' | 'emerald' | 'violet' | 'zinc'; asBadges?: boolean }) {
  if (items.length === 0) return null;
  const labelColor = ({
    cyan: 'text-cyan-300',
    rose: 'text-rose-300',
    emerald: 'text-emerald-300',
    violet: 'text-violet-300',
    zinc: 'text-zinc-400',
  })[tone];
  const dotColor = ({
    cyan: 'bg-cyan-400',
    rose: 'bg-rose-400',
    emerald: 'bg-emerald-400',
    violet: 'bg-violet-400',
    zinc: 'bg-zinc-500',
  })[tone];

  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 items-baseline py-1.5">
      <div className={'text-[11px] uppercase tracking-wider font-semibold ' + labelColor}>{label}</div>
      <div className="flex flex-wrap items-baseline gap-1.5">
        {asBadges ? (
          items.map((item) => (
            <Badge key={item} variant="tag">{item}</Badge>
          ))
        ) : (
          items.map((item, i) => (
            <span key={item} className="text-xs text-zinc-300 leading-relaxed">
              <span className={'inline-block size-1 rounded-full mr-1.5 align-middle ' + dotColor} />
              {item}
              {i < items.length - 1 && <span className="text-zinc-700 mx-1.5">·</span>}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function AboutThisProject(props: AboutProps) {
  const allEmpty =
    !props.tagline &&
    props.must_haves.length === 0 &&
    props.non_goals.length === 0 &&
    props.success_criteria.length === 0 &&
    props.likes.length === 0 &&
    props.dislikes.length === 0 &&
    props.avoid.length === 0;

  if (allEmpty) return null;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold bg-gradient-to-r from-cyan-200 via-zinc-100 to-violet-200 bg-clip-text text-transparent">
          About this project
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">pointers</span>
      </div>

      {props.tagline && (
        <p className="mb-3 pb-3 border-b border-zinc-800/40 text-sm text-zinc-300 italic leading-relaxed">
          {props.tagline}
        </p>
      )}

      <div className="divide-y divide-zinc-800/30">
        <Row label="Must-haves" items={props.must_haves} tone="cyan" />
        <Row label="Non-goals" items={props.non_goals} tone="rose" />
        <Row label="Success" items={props.success_criteria} tone="emerald" />
        <Row label="Likes" items={props.likes} tone="cyan" asBadges />
        <Row label="Dislikes" items={props.dislikes} tone="rose" asBadges />
        <Row label="Avoid" items={props.avoid} tone="rose" asBadges />
      </div>
    </div>
  );
}
