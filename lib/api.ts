// Shared route helpers — auth + JSON parse + zod validation in one shot.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBearer } from './auth';
import { scanDeletedDbFds } from './db/client';

export type AuthBodyResult<T> =
  | { ok: true; data: T; ignored?: string[] }
  | { ok: false; res: NextResponse };

export async function readAuthBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<AuthBodyResult<T>> {
  const authError = requireBearer(req);
  if (authError) return { ok: false, res: authError };

  // adr-018: refuse mutations when our DB fds point at deleted inodes — a 503
  // the skill can see beats a 201 whose data evaporates on restart.
  const deletedFds = scanDeletedDbFds();
  if (deletedFds.length > 0) {
    return {
      ok: false,
      res: NextResponse.json({
        error: 'db_write_path_unsafe',
        detail: 'Database fds point at deleted inodes (WAL-split class, adr-018). Writes would be silently lost. Rescue per adr-015 BEFORE any restart.',
        deleted_fds: deletedFds,
      }, { status: 503 }),
    };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 },
      ),
    };
  }

  // #688: zod strips keys the schema does not know, so a caller sending a field the DB lacks used to
  // get a 200 with the value silently discarded. Report those keys so a route can echo them back.
  const ignored =
    body && typeof body === 'object' && !Array.isArray(body) && schema instanceof z.ZodObject
      ? Object.keys(body as Record<string, unknown>).filter((k) => !Object.hasOwn((schema as z.ZodObject<z.ZodRawShape>).shape, k))
      : [];
  return { ok: true, data: parsed.data, ignored };
}

export function notFound(label = 'Not found'): NextResponse {
  return NextResponse.json({ error: label }, { status: 404 });
}

export function badRequest(label: string): NextResponse {
  return NextResponse.json({ error: label }, { status: 400 });
}

export function conflict(label: string): NextResponse {
  return NextResponse.json({ error: label }, { status: 409 });
}

export function parseIntId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
