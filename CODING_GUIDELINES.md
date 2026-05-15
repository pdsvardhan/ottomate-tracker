# Ottomate Tracker — Coding Guidelines

Single source of truth for code-style and architectural rules when working on the tracker repo. Stage 3.3 reformat reads this; Stage 3.4 codegen reads this.

## Stack

- **Framework**: Next.js 16.1 App Router on `node:22-bookworm-slim` (ADR-003)
- **DB**: `better-sqlite3` 11.8 + `drizzle-orm` 0.36. Migration-first bootstrap (ADR-007); no runtime schema drift
- **Styling**: Tailwind v4.2 + Radix primitives + `lucide-react` icons. `class-variance-authority` for variants, `tailwind-merge` for prop-driven className composition
- **Validation**: `zod` 3.24 at every API boundary. No untyped JSON crossing the wire
- **State**: RSC-first. Reach for `useState`/`next-themes` only when an interaction crosses a hydration boundary. `@xyflow/react` for graph; `cmdk` for command palette
- **Forms**: `react-hook-form` + `zod` (when interactive forms appear). RSC actions otherwise
- **Tests**: `vitest` 2.1 for unit + lib; `@playwright/test` 1.59 for e2e flows. No Snyk — Trivy + Grype + OSV-Scanner only (ADR-006)

## Authentication

- **GET endpoints**: no auth (localhost-bound per ADR-002, Cloudflare Tunnel handles external)
- **POST / PATCH / DELETE**: `Authorization: Bearer <TRACKER_API_TOKEN>` mandatory (ADR-004). Use the `requireBearer(req)` middleware in `lib/auth.ts`. Failed auth: 401 (missing) or 403 (wrong)
- Token at `/opt/homeserver/ottomate/.token` (chmod 600). Loaded into `.env` as `TRACKER_API_TOKEN`. Rotate quarterly

## DB conventions

- Migrations live in `drizzle/`. Generate with `npm run db:generate`, apply with `npm run db:migrate`
- All schema changes go through migrations — never `db:push` in production
- FTS5 maintenance via triggers (see `adr_index` triggers as the canonical pattern). New searchable tables MUST add corresponding `*_ai` / `*_au` / `*_ad` triggers
- Risks resolve, not delete (ADR-005). Use `risk_lifecycle_transitions` to record state changes
- Backup before any destructive op: `POST /api/backup` writes to `/opt/homeserver/ottomate/data/backups/<timestamp>.db`

## API conventions

- All POST/PATCH bodies are JSON; all responses are JSON
- Errors use HTTP status + `{ error: string, details?: object }`
- Validation errors → 400 with zod issue details
- Not found → 404 with `{ resource, slug }` details
- Conflict (duplicate slug, etc.) → 409
- Mutations write to `skill_events` audit table when they affect anti-gaslight surfaces (locks, builds, verifier results, integrate)

## Component conventions

- All UI components go through `master_components` first. `picked=true` + `asset_library_ref IS NOT NULL` is enforced at Stage 2.8 lock-in
- Stage 1 `components` rows are design intent; Stage 2.4 picks against the asset library
- New components must be seeded via `/ottomate seed-component` before being referenced

## File layout

- `app/` — Next App Router pages + route handlers
- `components/` — React components (server + client). Subdir per page/feature where helpful
- `lib/` — pure TS utilities, DB client, zod schemas
- `drizzle/` — schema + migrations
- `scripts/` — tsx scripts (seeders, mirrors, audits)
- `architecture/` — Mermaid `.mmd` sources rendered at build via `@mermaid-js/mermaid-cli`

## Don't

- Don't merge tasks-dashboard into the tracker (ADR-001) — they stay separate
- Don't use Snyk or Percy SaaS (ADR-006)
- Don't reach for SaaS subscriptions when a self-hosted free option exists
- Don't add silent fallbacks. Surface failures explicitly — anti-gaslighting is the bedrock
- Don't write SOFT warnings as blockers. BLOCK / PROCEED only (sanity-check.md model)
- Don't bypass the lock-in gate in Stage 4. No code changes before user confirms extracted items

## Lock-in gate posture

- Verifier sub-agent (Agent tool with locked-manifest + diff inputs) is mandatory in Stage 3.4 and 4.7
- Never accept coder agent claims as proof. Verifier reads what was actually committed
- Every iteration writes a trace report (raw → items → built → verified). Inspect at `/iterations/[id]`

## Pre-commit / CI

- `npm run lint` (eslint-config-next)
- `npm run test` (vitest)
- Trivy + Grype + OSV-Scanner on container images (nightly)
- E2E Playwright suite on every Stage 3 build before deploy
