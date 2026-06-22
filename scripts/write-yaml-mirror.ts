#!/usr/bin/env tsx
// Pack-up + write YAML mirrors to disk in one step.
// Runs on the HOST (not inside the tracker container) — that's why
// it can write to /mnt/storage/websites/<slug>/ when the container
// only has /repos mounted read-only.
//
// Iteration #6 follow-up (ADR-011): also walks each repo's public_docs/
// subdirectory and POSTs the bodies into project_docs via the new
// /api/projects/<slug>/public-docs endpoint.
//
// Usage:
//   npx tsx scripts/write-yaml-mirror.ts <slug>
//   npx tsx scripts/write-yaml-mirror.ts <slug> --no-pack-up  (just GET, no backup)
//   npx tsx scripts/write-yaml-mirror.ts <slug> --skip-public-docs  (skip the ingest)
//
// Env overrides:
//   TRACKER_BASE   default http://127.0.0.1:8110
//   REPOS_BASE     default /mnt/storage/websites
//   TRACKER_API_TOKEN_FILE  default /opt/homeserver/ottomate/.token

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const TRACKER_BASE = process.env.TRACKER_BASE ?? 'http://127.0.0.1:8110';
const REPOS_BASE = process.env.REPOS_BASE ?? '/mnt/storage/websites';
const TOKEN_FILE = process.env.TRACKER_API_TOKEN_FILE ?? '/opt/homeserver/ottomate/.token';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const skipPackup = args.includes('--no-pack-up');
const skipPublicDocs = args.includes('--skip-public-docs');

if (!slug) {
  console.error('usage: write-yaml-mirror <slug> [--no-pack-up] [--skip-public-docs]');
  process.exit(1);
}

const token = readFileSync(TOKEN_FILE, 'utf8').trim();

interface PackUpResponse {
  summary: { counts: Record<string, number>; pending_reports: number };
  backup: { ok: boolean; path: string | null };
  yaml_mirror: {
    ok: boolean;
    files: Array<{ filename: string; hash: string; size_bytes: number; body: string }>;
  } | null;
}

interface YamlMirrorResponse {
  files: Array<{ filename: string; hash: string; size_bytes: number; body: string }>;
}

async function callApi(): Promise<PackUpResponse | YamlMirrorResponse> {
  if (skipPackup) {
    const res = await fetch(`${TRACKER_BASE}/api/projects/${slug}/yaml-mirror`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`yaml-mirror fetch failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as YamlMirrorResponse;
  }
  const res = await fetch(`${TRACKER_BASE}/api/pack-up`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ project_slug: slug }),
  });
  if (!res.ok) {
    throw new Error(`pack-up failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as PackUpResponse;
}

function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// iter-7 (WS-F): public_docs/ uses a frontmatter convention. Any *.md with
// `public: true` is mirrored; doc_name comes from the frontmatter `type` (or the
// filename). The full body (frontmatter included) is sent — the UI parses metadata.
interface PublicDocPayload {
  doc_name: string;
  body: string;
}

function parsePublicFlag(raw: string): { isPublic: boolean; type: string | null } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { isPublic: false, type: null };
  let isPublic = false;
  let type: string | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.+?)\s*$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const val = kv[2].replace(/^["']|["']$/g, '').trim();
    if (key === 'public') isPublic = /^true$/i.test(val);
    if (key === 'type') type = val.toLowerCase();
  }
  return { isPublic, type };
}

function readPublicDocs(projectDir: string): PublicDocPayload[] {
  const dir = path.join(projectDir, 'public_docs');
  if (!existsSync(dir)) return [];
  const out: PublicDocPayload[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    let body: string;
    try {
      body = readFileSync(path.join(dir, file), 'utf8');
    } catch {
      continue;
    }
    if (body.trim().length === 0) continue;
    const { isPublic, type } = parsePublicFlag(body);
    if (!isPublic) continue;
    const doc_name = (type ?? file.replace(/\.md$/, '')).toLowerCase();
    out.push({ doc_name, body });
  }
  return out;
}

async function ingestPublicDocs(projectDir: string): Promise<void> {
  const docs = readPublicDocs(projectDir);
  if (docs.length === 0) {
    console.log('  · public_docs/ ingest: no docs to send (skipped)');
    return;
  }
  const res = await fetch(`${TRACKER_BASE}/api/projects/${slug}/public-docs`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ docs, delete_missing: true }),
  });
  if (!res.ok) {
    console.warn(`  ⚠ public_docs/ ingest failed: ${res.status} ${await res.text()}`);
    return;
  }
  const data = (await res.json()) as { summary: Record<string, string>; total_docs: number };
  for (const [name, verb] of Object.entries(data.summary)) {
    console.log(`  · public_docs/ ${name}: ${verb}`);
  }
  console.log(`  · project_docs total for ${slug}: ${data.total_docs}`);
}

(async () => {
  const data = await callApi();
  const files = 'yaml_mirror' in data ? data.yaml_mirror?.files : data.files;
  if (!files || files.length === 0) {
    console.error('No files returned. Aborting.');
    process.exit(2);
  }

  const projectDir = path.join(REPOS_BASE, slug);
  if (!existsSync(projectDir)) {
    console.error(
      `Project repo dir does not exist: ${projectDir}\n` +
        `Either the slug is wrong or the project repo hasn't been cloned. ` +
        `(Skill scaffolding clones it during Stage 3 — for backfill onboarding, ` +
        `the repo should already be here.)`,
    );
    process.exit(3);
  }

  let written = 0;
  let unchanged = 0;
  let driftWarnings = 0;
  for (const f of files) {
    const full = path.join(projectDir, f.filename);
    mkdirSync(path.dirname(full), { recursive: true });
    let priorHash: string | null = null;
    if (existsSync(full)) {
      try {
        priorHash = fnv1a(readFileSync(full, 'utf8'));
      } catch {
        priorHash = null;
      }
    }
    if (priorHash === f.hash) {
      unchanged++;
      continue;
    }
    if (priorHash && priorHash !== f.hash) {
      const yamlMirrorRow = (data as PackUpResponse).yaml_mirror?.files.find(
        (x) => x.filename === f.filename,
      );
      if (yamlMirrorRow && yamlMirrorRow.hash !== priorHash) {
        console.warn(
          `  ⚠ DRIFT WARNING: ${f.filename} on disk differs from last recorded hash; ` +
            `overwriting with fresh DB serialisation. (To preserve disk, abort here.)`,
        );
        driftWarnings++;
      }
    }
    writeFileSync(full, f.body, 'utf8');
    console.log(`  ✓ ${f.filename} (${f.size_bytes} bytes, hash=${f.hash})`);
    written++;
  }

  // public_docs/ ingest — ADR-011 follow-up (iteration #6 item 51).
  if (!skipPublicDocs) {
    await ingestPublicDocs(projectDir);
  } else {
    console.log('  · public_docs/ ingest: skipped via --skip-public-docs');
  }

  console.log();
  if ('summary' in data && data.summary) {
    console.log(`summary counts: ${JSON.stringify(data.summary.counts)}`);
  }
  if ('backup' in data && data.backup) {
    console.log(`backup: ${data.backup.path ?? '(failed)'}`);
  }
  console.log(
    `wrote ${written} file(s), ${unchanged} unchanged, ${driftWarnings} drift warning(s) → ${projectDir}`,
  );
})();
