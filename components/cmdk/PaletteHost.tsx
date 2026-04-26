// Server-side wrapper that fetches the project list once and renders
// the client-side CommandPalette in the TopBar.
// Defensive: if the DB isn't reachable yet (e.g. Next.js build-time
// prerender of /_not-found before the data volume mounts), the palette
// still mounts with an empty project list.

import { desc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { CommandPalette } from './CommandPalette';

export async function PaletteHost() {
  let projects: { slug: string; display_name: string }[] = [];
  try {
    const db = await getDb();
    projects = db.select({
      slug: schema.projects.slug,
      display_name: schema.projects.display_name,
    }).from(schema.projects)
      .orderBy(desc(schema.projects.updated_at)).all();
  } catch (err) {
    console.warn('[ottomate] PaletteHost could not load projects:', err);
  }
  return <CommandPalette projects={projects} />;
}
