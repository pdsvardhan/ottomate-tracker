// Feature-verify harness — evidence capture (Task 3). Evidence is ALWAYS on: every case gets
// its trace/video/network/console + any bytes-as-proof (the saved file, the DB-row JSON). A red
// in the matrix links to the exact proof here — that is what makes a failure un-arguable.

import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Create (if needed) the evidence dir for one case and return its absolute path. */
export async function caseEvidenceDir(evidenceRoot: string, caseName: string): Promise<string> {
  const safe = caseName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  const dir = path.join(evidenceRoot, safe);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Persist an arbitrary artifact (bytes-as-proof) and return its path for the matrix. */
export async function saveArtifact(dir: string, name: string, data: Buffer | string): Promise<string> {
  const p = path.join(dir, name);
  await fs.writeFile(p, data);
  return p;
}

/** Persist the machine-readable case×outcome matrix + a human-readable summary at the run root. */
export async function writeMatrix(evidenceRoot: string, matrix: unknown, summary: string): Promise<void> {
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(path.join(evidenceRoot, 'matrix.json'), JSON.stringify(matrix, null, 2));
  await fs.writeFile(path.join(evidenceRoot, 'summary.md'), summary);
}
