// Catch-all /api/* 404 — return JSON instead of the full Next.js HTML page.
// Created 2026-05-19 to fix audit issue #14 (speculative skill probes used to
// land on the framework HTML 404). Next.js routes specific paths first, so
// this only fires when no /api route matches.

import { NextResponse } from 'next/server';

interface Ctx { params: Promise<{ notfound: string[] }>; }

function buildResponse(path: string, method: string) {
  return NextResponse.json(
    {
      error: 'not_found',
      method,
      path: '/api/' + path,
      detail:
        'No API route matches this path. See references/tracker-api.md ' +
        'in the ottomate skill for implemented endpoints. Some endpoints ' +
        'in older docs are aspirational and were never built (e.g. ' +
        'stage-*-handoff, components-pick/status).',
    },
    { status: 404 }
  );
}

async function pathFrom(params: Ctx['params']): Promise<string> {
  const { notfound } = await params;
  return Array.isArray(notfound) ? notfound.join('/') : String(notfound ?? '');
}

export async function GET(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'GET');
}
export async function POST(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'POST');
}
export async function PATCH(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'PATCH');
}
export async function PUT(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'PUT');
}
export async function DELETE(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'DELETE');
}
export async function HEAD(req: Request, { params }: Ctx) {
  return buildResponse(await pathFrom(params), 'HEAD');
}

export const runtime = 'nodejs';
