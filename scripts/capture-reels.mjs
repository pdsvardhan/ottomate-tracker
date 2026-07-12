// scripts/capture-reels.mjs — iter-65 #505: scripted 16:9 showcase clips.
//
// Host-side wrapper: runs the recorder (capture-reels-inner.mjs) inside the
// pinned Playwright image (same pattern as build-previews.mjs step 4) with
// --network host so the recorder reaches each project's localhost port
// directly — no Cloudflare round-trip, no SSO gate (leaploop's local port is
// pre-auth), deterministic and re-runnable whenever a site changes.
//
//   npm run capture:reels                 # all projects
//   npm run capture:reels -- stateofus    # one project
//
// Output: data/media/<slug>/reel.webm (1920×1080, ~12-15s scroll journey).
// The previous reel.* file is archived to data/media/_replaced/, never deleted.

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Pinned to the repo's playwright lib version (1.59.1) — the recorder uses
// /work/node_modules/playwright, so image and lib must agree (unlike
// build-previews, whose sandbox ships its own node_modules for v1.60.0).
const PW_IMAGE = process.env.PW_IMAGE || 'mcr.microsoft.com/playwright:v1.59.1-jammy';

const only = process.argv.slice(2).filter((a) => !a.startsWith('-')).join(',');

execSync(
  `docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp ` +
  (only ? `-e ONLY="${only}" ` : '') +
  `-v "${ROOT}":/work -w /work ${PW_IMAGE} node scripts/capture-reels-inner.mjs`,
  { stdio: 'inherit' },
);
