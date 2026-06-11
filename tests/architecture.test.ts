import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, ctx, makeReq } from './helpers';

import { POST as createProject } from '@/app/api/projects/route';
import { GET as getArchitecture, POST as upsertDiagram } from '@/app/api/projects/[slug]/architecture/route';

const SLUG = 'arch-test-proj';
const MMD_V1 = 'flowchart LR\n  A[Client] --> B[Server]\n  B --> C[(DB)]';
const MMD_V2 = 'flowchart TD\n  X[Edge] --> Y[Core]\n  Y --> Z[(Store)]';

interface DiagramRow { kind: string; mermaid_src: string; caption: string | null; position: number; }

async function listDiagrams(): Promise<DiagramRow[]> {
  const res = await getArchitecture(makeReq('GET', `/api/projects/${SLUG}/architecture`), ctx({ slug: SLUG }));
  expect(res.status).toBe(200);
  const body = await res.json();
  return body.diagrams as DiagramRow[];
}

beforeAll(async () => {
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'Arch Test' }, authHeaders()));
});

describe('/api/projects/[slug]/architecture', () => {
  it('rejects unauthenticated POST', async () => {
    const res = await upsertDiagram(
      makeReq('POST', `/api/projects/${SLUG}/architecture`, { kind: 'topology', title: 'Topology', mermaid_src: MMD_V1 }),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(401);
  });

  it('404s for an unknown project', async () => {
    const res = await upsertDiagram(
      makeReq('POST', '/api/projects/no-such-project/architecture', { kind: 'topology', title: 'Topology', mermaid_src: MMD_V1 }, authHeaders()),
      ctx({ slug: 'no-such-project' }),
    );
    expect(res.status).toBe(404);
  });

  it('rejects an invalid kind (422)', async () => {
    const res = await upsertDiagram(
      makeReq('POST', `/api/projects/${SLUG}/architecture`, { kind: 'mindmap', title: 'Nope', mermaid_src: MMD_V1 }, authHeaders()),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(422);
  });

  it('creates a diagram (201) and GET returns it', async () => {
    const res = await upsertDiagram(
      makeReq('POST', `/api/projects/${SLUG}/architecture`, {
        kind: 'topology',
        title: 'System topology',
        mermaid_src: MMD_V1,
        caption: 'components and stores',
      }, authHeaders()),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.diagram.kind).toBe('topology');
    expect(body.diagram.mermaid_src).toBe(MMD_V1);
    expect(body.diagram.caption).toBe('System topology — components and stores');

    const diagrams = await listDiagrams();
    expect(diagrams.filter((d) => d.kind === 'topology')).toHaveLength(1);
  });

  it('upsert replaces the existing row for the same kind (still 1 row, content updated)', async () => {
    const res = await upsertDiagram(
      makeReq('POST', `/api/projects/${SLUG}/architecture`, {
        kind: 'topology',
        title: 'Revised topology',
        mermaid_src: MMD_V2,
      }, authHeaders()),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);

    const topology = (await listDiagrams()).filter((d) => d.kind === 'topology');
    expect(topology).toHaveLength(1);
    expect(topology[0].mermaid_src).toBe(MMD_V2);
    expect(topology[0].caption).toBe('Revised topology');
  });

  it('accepts the platform kind (iter-16, Doc A portfolio-level ecosystem view)', async () => {
    const res = await upsertDiagram(
      makeReq('POST', `/api/projects/${SLUG}/architecture`, {
        kind: 'platform',
        title: 'Platform',
        mermaid_src: MMD_V1,
        caption: 'ecosystem in one view',
      }, authHeaders()),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.diagram.kind).toBe('platform');
    expect(body.diagram.caption).toBe('Platform — ecosystem in one view');

    const platform = (await listDiagrams()).filter((d) => d.kind === 'platform');
    expect(platform).toHaveLength(1);
  });
});
