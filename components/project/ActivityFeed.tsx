// ActivityFeed — server component (no client JS needed for the static rendering).
// Renders ActivityItem rows pulled from the combined activity API surface (E.4).

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface ActivityEvent {
  at: number;
  kind: 'skill_event' | 'iteration' | 'feature' | 'flow' | 'component_pick';
  actor: string;
  verb: string;
  target_label: string;
  target_kind?: string;
  target_id?: string | number;
  detail?: string;
}

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - unixSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

function targetHref(slug: string, e: ActivityEvent): string | null {
  if (e.target_kind === 'iteration') return `/iterations/${e.target_id}`;
  // Feature links now point at the Features & Flows tab (/capabilities) — the old
  // /features route was removed in the showcase overhaul and would 404.
  if (e.target_kind === 'feature') return `/projects/${slug}/capabilities`;
  if (e.target_kind === 'component') return `/projects/${slug}/components-pick`;
  return null;
}

const KIND_TONE: Record<string, 'shipped' | 'open' | 'building' | 'neutral'> = {
  iteration: 'building',
  feature: 'shipped',
  flow: 'neutral',
  component_pick: 'open',
  skill_event: 'neutral',
};

export function ActivityFeed({
  slug,
  events,
  emptyLabel = 'No activity yet.',
}: {
  slug: string;
  events: ActivityEvent[];
  emptyLabel?: string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-zinc-600 italic px-4 py-6 text-center">{emptyLabel}</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/40">
      {events.map((e, idx) => {
        const href = targetHref(slug, e);
        const tone = KIND_TONE[e.kind] ?? 'neutral';
        const inner = (
          <div className="flex items-start gap-3 py-2.5">
            <div className="shrink-0 pt-0.5 w-16 text-[11px] font-mono text-zinc-500">
              {timeAgo(e.at)}
            </div>
            <Badge variant="status" tone={tone}>
              {e.verb}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-300 truncate">
                <span className="text-zinc-500">{e.actor}</span>{' '}
                <span className="font-medium">{e.target_label}</span>
              </div>
              {e.detail && <p className="mt-0.5 text-[11px] text-zinc-500 truncate">{e.detail}</p>}
            </div>
          </div>
        );

        return (
          <li key={idx}>
            {href ? (
              <Link href={href} className="block hover:bg-zinc-900/40 -mx-2 px-2 rounded transition-colors">
                {inner}
              </Link>
            ) : (
              <div className="px-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
