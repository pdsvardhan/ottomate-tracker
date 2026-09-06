// /api/projects/[slug]/todos — per-project to-do list (E.3, schema from CHUNK 1).
// 2026-09-07 (#774/#530): rows carry state / kind / blocked_on / priority / origin / blocked_by / body /
// last_verified_at. GET returns bucket counts so a filling misc/other bucket is visible.
//   GET ?state=<state>   only that state
//   GET ?open=1          state NOT IN (done, parked) — what the skill's load block shows

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';
import { TodoCreateSchema, TODO_STATES, normalizeTodoWrite, todoCounts } from '@/lib/validation/todos';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const stateFilter = url.searchParams.get('state');
  const openOnly = url.searchParams.get('open') === '1';
  if (stateFilter && !(TODO_STATES as readonly string[]).includes(stateFilter)) {
    return badRequest(`state must be one of: ${TODO_STATES.join(', ')}`);
  }
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const all = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.project_slug, slug))
    .orderBy(asc(schema.project_todos.sort_order), asc(schema.project_todos.id))
    .all();
  const todos = all.filter((t) =>
    (stateFilter ? t.state === stateFilter : true) &&
    (openOnly ? t.state !== 'done' && t.state !== 'parked' : true));

  return NextResponse.json({ count: todos.length, todos, counts: todoCounts(all) });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, TodoCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const { sort_order: _sortOrder, ...create } = result.data; void _sortOrder;
  const values = normalizeTodoWrite(create, null) as Partial<typeof schema.project_todos.$inferInsert>;
  db.insert(schema.project_todos).values({
    project_slug: slug,
    title: result.data.title,
    sort_order: result.data.sort_order ?? 0,
    done: false,
    state: 'open',
    kind: 'misc',
    ...values,
  }).run();

  const latest = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.project_slug, slug))
    .orderBy(asc(schema.project_todos.id))
    .all().slice(-1)[0];

  return NextResponse.json(
    result.ignored?.length ? { todo: latest, ignored: result.ignored, warning: 'unknown fields were not stored' } : { todo: latest },
    { status: 201 },
  );
}
