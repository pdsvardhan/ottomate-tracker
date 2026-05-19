// /api/projects/[slug]/activity — combined activity feed (E.4).
// Sources today: skill_events + iterations transitions + features.updated_at +
// flows.updated_at + components.picked_at. Git commits via Gitea API are
// queued as a follow-up (need API token + caching).

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

export const runtime = 'nodejs';

interface ActivityEvent {
  at: number; // unix seconds
  kind: 'skill_event' | 'iteration' | 'feature' | 'flow' | 'component_pick';
  actor: string;
  verb: string;
  target_label: string;
  target_kind?: string;
  target_id?: string | number;
  detail?: string;
}

interface Ctx { params: Promise<{ slug: string }>; }

function toUnixSeconds(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Math.floor(Date.parse(value) / 1000);
  return 0;
}

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const events: ActivityEvent[] = [];

  // skill_events
  const skillEvents = db.select().from(schema.skill_events)
    .where(eq(schema.skill_events.project_slug, slug))
    .orderBy(desc(schema.skill_events.event_at))
    .limit(limit).all();
  for (const e of skillEvents) {
    events.push({
      at: toUnixSeconds(e.event_at),
      kind: 'skill_event',
      actor: e.session_id ?? 'skill',
      verb: e.event_type ?? 'event',
      target_label: e.event_type ?? 'skill event',
      target_id: e.id,
    });
  }

  // iterations
  const iters = db.select().from(schema.iterations)
    .where(eq(schema.iterations.project_slug, slug))
    .orderBy(desc(schema.iterations.iteration_number))
    .all();
  for (const it of iters) {
    if (it.integrated_at) {
      events.push({
        at: toUnixSeconds(it.integrated_at),
        kind: 'iteration',
        actor: 'skill',
        verb: 'integrated',
        target_label: `iteration #${it.iteration_number}`,
        target_kind: 'iteration',
        target_id: it.id,
      });
    }
    if (it.locked_at) {
      events.push({
        at: toUnixSeconds(it.locked_at),
        kind: 'iteration',
        actor: 'user',
        verb: 'locked',
        target_label: `iteration #${it.iteration_number}`,
        target_kind: 'iteration',
        target_id: it.id,
      });
    }
  }

  // Feature updates
  const feats = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug))
    .orderBy(desc(schema.features.updated_at))
    .limit(20).all();
  for (const f of feats) {
    events.push({
      at: toUnixSeconds(f.updated_at),
      kind: 'feature',
      actor: 'skill',
      verb: f.status === 'done' ? 'shipped' : 'updated',
      target_label: f.title,
      target_kind: 'feature',
      target_id: f.id,
    });
  }

  // Component picks
  const picks = db.select().from(schema.components)
    .where(eq(schema.components.project_slug, slug))
    .all();
  for (const c of picks) {
    if (c.picked_at) {
      events.push({
        at: toUnixSeconds(c.picked_at),
        kind: 'component_pick',
        actor: 'user',
        verb: 'picked',
        target_label: `${c.name} ${c.asset_library_ref ? '→ ' + c.asset_library_ref : ''}`,
        target_kind: 'component',
        target_id: c.id,
      });
    }
  }

  // Sort descending by `at`, dedupe by (kind, target_id, verb, at) tuple.
  events.sort((a, b) => b.at - a.at);
  const seen = new Set<string>();
  const deduped: ActivityEvent[] = [];
  for (const e of events) {
    const key = `${e.kind}|${e.target_id}|${e.verb}|${e.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
    if (deduped.length >= limit) break;
  }

  return NextResponse.json({ count: deduped.length, events: deduped });
}
