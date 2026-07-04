// /api/master-components/[id] — single component CRUD.
// PUT now also writes source_code → /asset-library/<id>/<primary_file> when provided.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { MasterComponentPatchSchema } from '@/lib/validation/master-components';

export const runtime = 'nodejs';

const ASSET_ROOT = '/asset-library/components';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) return notFound(`Component '${id}' not found`);
  return NextResponse.json({ component });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, MasterComponentPatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!existing) return notFound(`Component '${id}' not found`);

  const { source_code, ...dbUpdates } = result.data;
  const finalUpdates: Record<string, unknown> = { ...dbUpdates };

  if (typeof source_code === 'string' && source_code.trim().length > 0) {
    const filename = (dbUpdates.primary_file ?? existing.primary_file ?? 'index.tsx')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    if (filename.length === 0) {
      return badRequest('primary_file must contain at least one valid character');
    }
    const dir = path.join(ASSET_ROOT, id);
    const filePath = path.join(dir, filename);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, source_code, 'utf8');
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to write source file', detail: String(err) },
        { status: 500 },
      );
    }
    if (!dbUpdates.source_paths || dbUpdates.source_paths.length === 0) {
      finalUpdates.source_paths = [filePath];
      finalUpdates.primary_file = filename;
    }
  }

  const updates = { ...finalUpdates, updated_at: new Date() };
  db.update(schema.master_components).set(updates)
    .where(eq(schema.master_components.id, id)).run();
  const after = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  return NextResponse.json({ component: after });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.master_components.id })
    .from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!existing) return notFound(`Component '${id}' not found`);
  // Unlink any project component-picks that reference this master component first,
  // else the FK (components.asset_library_ref) blocks the delete (iter-15). The
  // slot keeps its place; it just loses the now-deleted chosen component.
  const unlinked = db.update(schema.components)
    .set({ asset_library_ref: null, picked: false })
    .where(eq(schema.components.asset_library_ref, id)).run();
  db.delete(schema.master_components).where(eq(schema.master_components.id, id)).run();
  return NextResponse.json({ deleted: id, unlinked_picks: unlinked.changes ?? 0 });
}

// iter-6 item 260: PATCH is the conventional partial-update verb (the detail page docs
// and skill calls use PATCH). PUT already applies partial updates, so alias them.
export const PATCH = PUT;
