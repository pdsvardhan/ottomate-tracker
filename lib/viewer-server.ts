// Server-side read of the owner/visitor rule (lib/viewer.ts) from the live request headers.
// Use in server components, layouts and server actions — never in a client component.

import { headers } from 'next/headers';
import { viewerFrom, type Viewer } from './viewer';

export async function getViewer(): Promise<Viewer> {
  return viewerFrom(await headers());
}
