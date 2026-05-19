// /api/todos/[id] — single project_todo CRUD (E.3).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  done: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

interface Ctx { params: Promise<{ id: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select().from(schema.project_todos).where(eq(schema.project_todos.id, idNum)).get();
  if (!existing) return notFound(`Todo ${idNum} not found`);
  db.update(schema.project_todos).set({ ...result.data, updated_at: new Date() })
    .where(eq(schema.project_todos.id, idNum)).run();
  const after = db.select().from(schema.project_todos).where(eq(schema.project_todos.id, idNum)).get();
  return NextResponse.json({ todo: after });
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
