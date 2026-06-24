# iter-36 — Component review punch-list (concerns → batch fix)

**Mode:** user reviews components one by one; record ALL concerns; fix in ONE batch (no code yet).
**Verdict per component:** `KEEP-FIX` (→ items 274 fixtures / 275 hero-state / 276 providers / 277 html) or `DELETE` (→ item 280, "useless or ugly").

---

## 1. mc-animated-list — AnimatedList — status: live — verdict: KEEP-FIX
- **Concern (user):** ours looks nothing like the source — generic Alpha/Bravo/Charlie/Delta dark pills vs the source's notification cards.
- **Root cause:** no fixture override → `genericChildren()` fallback. AnimatedList renders whatever children it's handed, so the demo *data* defines the look. Source feeds rich notification items; we feed neutral pills.
- **Secondary:** sandbox is dark-themed (#0a0a0f) vs source light bg — expected (app is dark), but fixture must read well on dark.
- **Fix (mirror-exact):** pull magicui AnimatedList demo source; reproduce its 5 notification items (icon chip color+emoji, title, "Xm ago", "Magic UI" subtitle) on a **LIGHT** bg like magicui. 275 — seek the stagger reveal to a populated frame for the still.

---
## DELETE candidates (running)
_(none yet)_

---
## GLOBAL CONCERN (applies to ~all magicui / reactbits components)
Ours don't match the upstream site previews because upstream shows a hand-built **demo**, not the bare component:
curated sample data+props, a demo wrapper (sizing/padding/centering/frame), the right theme/bg
(magicui demos usually light, reactbits dark), and the animation playing. Ours strips all that →
generic fixture data, default sizing, forced dark bg, frozen still.
**=> item 274 is really "port each upstream demo" (data+props+children+wrapper+sizing), not just "add data". + 275 motion.**
**DECISION (locked 2026-06-24):** MIRROR UPSTREAM EXACTLY. Reproduce each demo's data/props/layout AND its
background/theme per-component (magicui demos -> light, reactbits -> dark). Pull the REAL upstream demo source to match.
- **Pipeline change (folds into 274):** htmlFor + fixture system must support a per-component `theme`/`bg`
  (currently forced dark `#0a0a0f` + class="dark"). Detail-page preview iframes become mixed light/dark — accepted by owner.
- **Demo source of truth:** magicui -> magicui MCP registry (component + demo); reactbits -> DavidHDev/react-bits repo
  (component + its example/demo); shadcn -> shadcn MCP examples.

## ASSETS
- Sample avatar/headshot: local `C:\Users\pdsva\Downloads\ChatGPT Image Jun 24, 2026, 02_52_54 PM.png`
  → at fix-time copy to `preview-sandbox/sample-assets/avatar.png`; use for profile-card, avatar-stack, ai-chat-thread, any avatar/profile slot.

---
## SYSTEMIC FINDING (supersedes per-component manual review)
183 components; only **31 have ANY fixture**, and none are upstream-faithful → **~0 mirror upstream today**.
The "live" count (123) is the inflated measure. The catalog is really 3 buckets:

### Bucket A — real UI libraries WITH upstream demos → KEEP-FIX (port the demo) [~83]
magicui(25) · react-bits(17) · aceternity(12) · kibo(14) · originui(9) · tremor-blocks(6) · horizon-ui(1) · custom(good ones)
- These CAN mirror upstream: fetch each demo source (magicui MCP / react-bits repo / shadcn MCP / aceternity) → port data+props+wrapper+theme. This is the core of item 274.

### Bucket B — app-extracted slices, NO upstream demo, mostly broken → mostly DELETE [~53]
vercel-ai-chatbot(21) · kiranism-shadcn(9) · satnaing-shadcn-admin(6) · tasks-app(5) · media-dashboard-app(5) · tailadmin-v2(2) · balls-of-the-bull-app(2) · assistant-ui(1) · vision-ui(1) · unknown(1)
- These were scraped from full apps (admin dashboards, the AI-chatbot template, the owner's own projects). No standalone demo exists; most fail with needs-context/unresolvable-alias/missing-dep. Can't "mirror upstream" — there is no upstream component demo. KEEP only any that are self-contained + genuinely useful + render well (e.g. a couple AI blocks). Rest → item 280 delete.

### Bucket C — html/codepen one-offs (asset-library, 31 html) → CURATE [~31]
- Scraped codepen/uiverse snippets. Keep the genuinely good (coverflow, 3D product cards); DELETE the gimmicky/ugly ("Walking The Cow", "Water Droplets", "Sssscales", etc.). Fix html-path (277) only for the keepers.

**DELETION PHILOSOPHY: PENDING owner decision.**

---
## SEQUENCING (owner decision 2026-06-24)
**Do Bucket A to completion FIRST** (port upstream demos so ~83 library components mirror their source).
**Buckets B & C (deletes / item 280) DEFERRED** — revisit after A lands. Nothing deleted yet.

### Bucket A execution plan
1. Pipeline prerequisite: add per-component `theme`/`bg` to fixtures + htmlFor (mirror-exact needs light demos too).
2. Per library, pull real upstream demo source and port data+props+children+wrapper+theme into a fixture:
   magicui (MCP) → react-bits (repo) → aceternity → kibo/originui/tremor (shadcn-eco) → custom/horizon.
3. Rebuild + visually verify a batch per library; honest render-check (278) replaces painted-coverage.
4. Proof-first: AnimatedList (the flagged one) ported to magicui's light notification demo before scaling.

---
## PROGRESS LOG
- 2026-06-24: pipeline per-component `theme` added (light/dark). mc-animated-list ported to magicui demo (notification cards, light bg, emoji) — VERIFIED matches upstream. commit. Learned: write literal emoji bytes, not python \U escapes. Thumbnail shows 2 cards (stagger@500ms) — full stack reveals in live iframe; 275 can seek for a richer still.
- NEXT (Bucket A rollout): rest of magicui(24) -> react-bits(15 left, CSS already recovered) -> aceternity(12) -> kibo/originui/tremor -> custom/horizon. Port each upstream demo (data+props+wrapper+theme).

---
## ASSET RULE (owner 2026-06-24, REVISED)
Placeholders are FINE — owner: "you can source junk for all i care". Use reasonable placeholders freely
(picsum.photos / dummyimage / unsplash / emoji / generated SVG). Do NOT pester owner for assets.
Use the real headshot where an avatar fits; junk placeholders everywhere else.

## CATALOG SIZE NOTE
190 -> 183 drop this session = owner deleting components via the Ottomate UI delete button (intentional).
DB verified 183 rows, db_fds clean, no WAL-split — NOT data loss. Don't chase count reduction.

---
## BUCKET A ROLLOUT PROGRESS
- tremor: 6 ported; VERIFIED 5/6 live (area/bar/line charts, progress-circle 72%, tracker). mc-category-bar = missing-dep "./Tooltip" sibling -> recover from tremor source or drop (salvage).
- react-bits: 17 ported (theme dark). mc-model-viewer uses Khronos Duck.glb placeholder. PENDING my render-verify.
- aceternity: 12 ported (theme dark). PENDING my render-verify.
- magicui / kibo / originui+custom+horizon: agents still running.
- PLAN: after all agents finish -> one full rebuild + per-library montage verify + fix duds + publish. Report per library.

---
## BUCKET A — VERIFIED (montage, 2026-06-24)
Per-library live (incl. html): magicui 21/25 · react-bits 15/17 · kibo 11/14 · aceternity 9/12 · originui 5/9 · tremor 5/6 · custom 4/5 · horizon 1/1.  ~71/89 render faithfully (montage-confirmed quality, not just painted-coverage).
Duds (known cause):
  magicui: file-tree, scroll-progress, animated-beam, border-beam (effects/ref/positioning)
  aceternity: meteors, glowing-effect (need motion), card-spotlight (unresolvable-alias canvas-reveal sibling)
  kibo: kibo-editor (bubble-menu), kibo-table (TableBody null ctx), image-crop, resizable (pkg v4 API rename)
  react-bits: elastic-slider (needs provider -> 276), model-viewer (GLB loader dep)
  tremor: category-bar (missing ./Tooltip sibling)
  custom: transition-page-view (next/navigation -> needs-context gate; pipeline limit)
  originui: checkbox/radio/switch/slider read 'empty' but DO render small -> item 278 reclassifies.
NEXT: 278 honest render-check (reclassifies false-empties) -> salvage cheap duds (category-bar Tooltip, elastic-slider provider) -> remaining items 275/276/277/279.

---
## #278 DONE (honest render-check) — commit. live 126/183.
False-empties flipped live: checkbox/radio/slider/word-rotate/text-generate. Remaining empties are genuinely blank.
Genuine Bucket A empties (effects/context, hard): animated-beam, border-beam, meteors, glowing-effect, file-tree, scroll-progress, kibo-editor, switch. (Candidates for 275 hero/motion or accept.)
NEXT: #277 html/codepen render path (also unblocks Bucket C judgement).

---
## #277 DONE (html render path) — commit. Honest live 96/183.
- html components now build-rendered (inline css/js + CDN inject + #root||body measurement).
- mc-liquid-gradient-bg renders LIVE (99% cov, Three.js). 
- **30/31 html = empty 0-byte ingestion shells** -> honestly 'empty' now -> these ARE Bucket C deletes (or re-ingest from codepen).
- Honest live dropped 126->96 (exposed 30 empty-shell fakes). This is correct/anti-gaslight.
NEXT: Bucket B + C delete pass (item 280) — backup-gated; present kill list for owner approval.

---
## BUCKET C RECOVERED (not deleted!) — gist re-fetch 2026-06-24
KEY FINDING: the 30 "empty html shells" were NOT garbage — ingestion saved the gist URL (preview_url=gist.github.com/pdsvardhan/<id>) but never fetched content -> 0-byte stubs.
Fetched all 30 gists via GitHub API -> materialized files -> 28/30 render LIVE with real codepen content (verified via montage). Honest live 96->125.
Stragglers: mc-pure-css-3d-animated-carousel (gist had no .html -> no-source), mc-harmonic-bauhaus-pattern-generator (renders blank/needs interaction).
NOTE: recovered content lives on the asset volume (/mnt/storage/ottomate/assets/components), NOT git -> re-fetchable from gists; back up with DB at delete time.
REVISED B/C:
  - Bucket C: review the 28 now-rendering codepens on the site -> owner keeps good / deletes ugly (taste call). NOT auto-delete.
  - Bucket B: 23 broken app-internals (no gists, app slices) remain delete candidates -> owner confirms -> backup + delete.

---
## #280 BUCKET B/C DELETES DONE — 2026-06-24
Backed up first: DB VACUUM INTO (data/backups/backup-1782312597860.db, integrity ok) + tar of 25 source dirs (/mnt/storage/ottomate/assets/_iter36_deleted_20260624-201957.tar.gz).
Deleted 25 (DB row + source dir): all 23 Bucket B app-internals (18 via API now + 5 ai-* already removed via UI) + 2 non-salvageable Bucket C (pure-css-3d-carousel = gist had no html; harmonic-bauhaus = renders blank).
Kept: 28 recovered Bucket C codepens (render live).
Catalog 178 -> 158 total; honest live 125/158 (79%).
REMAINING in iter-36: 19 "review" (salvage fixture-able shadcn/filter/form, drop media-dashboard app-glue) -> 275 hero-state -> 276 providers -> 279 CRUD automation -> verifier + integrate.
