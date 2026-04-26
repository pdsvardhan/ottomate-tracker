// Shared route helpers — auth + JSON parse + zod validation in one shot.

import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { requireBearer } from './auth';

export type AuthBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; res: NextResponse };

export async function readAuthBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<AuthBodyResult<T>> {
  const authError = requireBearer(req);
  if (authError) return { ok: false, res: authError };

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

  return { ok: true, data: parsed.data };
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
