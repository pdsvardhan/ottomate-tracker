// Architecture tab — renders all .mmd diagrams in the project's architecture/ dir.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { MermaidView } from '@/components/architecture/MermaidView';

export const dynamic = 'force-dynamic';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

export default async function ArchitectureTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const archDir = path.join(REPOS_DIR, slug, 'architecture');
  let entries: string[] = [];
  try {
    entries = readdirSync(archDir);
  } catch {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500">No architecture diagrams yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Skill writes Mermaid sources to <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300">/repos/{slug}/architecture/*.mmd</code>.
        </p>
      </div>
    );
  }

  const diagrams = entries
    .filter((f) => f.endsWith('.mmd'))
    .map((name) => {
      try {
        const body = readFileSync(path.join(archDir, name), 'utf8');
        return { name, body };
      } catch {
        return null;
      }
    })
    .filter((x): x is { name: string; body: string } => x !== null);

  if (diagrams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500">No .mmd diagrams in architecture/.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {diagrams.map((d) => (
        <MermaidView key={d.name} source={d.body} filename={d.name} />
      ))}
    </div>
  );
}
