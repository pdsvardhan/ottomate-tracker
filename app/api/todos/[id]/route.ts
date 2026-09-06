// /api/todos/[id] — single project_todo CRUD (E.3).
// 2026-09-07 (#774/#530): PATCH accepts the full to-do model; done<->state stay in sync via
// normalizeTodoWrite; unknown fields are echoed back as ignored[] (#688), never silently dropped.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { TodoPatchSchema, normalizeTodoWrite } from '@/lib/validation/todos';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const todo = db.select().from(schema.project_todos).where(eq(schema.project_todos.id, idNum)).get();
  if (!todo) return notFound(`Todo ${idNum} not found`);
  return NextResponse.json({ todo });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, TodoPatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select().from(schema.project_todos).where(eq(schema.project_todos.id, idNum)).get();
  if (!existing) return notFound(`Todo ${idNum} not found`);
  const values = normalizeTodoWrite(result.data, existing) as Partial<typeof schema.project_todos.$inferInsert>;
  if (Object.keys(values).length === 0 && !result.ignored?.length) return badRequest('No fields to update');
  if (Object.keys(values).length > 0) {
    db.update(schema.project_todos).set({ ...values, updated_at: new Date() })
      .where(eq(schema.project_todos.id, idNum)).run();
  }
  const after = db.select().from(schema.project_todos).where(eq(schema.project_todos.id, idNum)).get();
  return NextResponse.json(
    result.ignored?.length ? { todo: after, ignored: result.ignored, warning: 'unknown fields were not stored' } : { todo: after },
  );
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.project_todos.id }).from(schema.project_todos)
    .where(eq(schema.project_todos.id, idNum)).get();
  if (!existing) return notFound(`Todo ${idNum} not found`);
  db.delete(schema.project_todos).where(eq(schema.project_todos.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
