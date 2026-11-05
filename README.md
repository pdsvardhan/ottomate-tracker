# Ottomate tracker

A website and API that keeps the record for every web project built with the Ottomate skill for Claude Code (Anthropic's AI coding tool).
It holds each project's plan, progress and test results outside the chat. Built with Next.js and SQLite.

> **About this public copy.** Published in November 2026 with its real commit history. It runs on the owner's home
> server alongside the [Ottomate skill](https://github.com/pdsvardhan/ottomate-skill), so hosts and paths in the code
> and docs assume that setup. Home-network addresses are replaced with documentation addresses (192.0.2.x). The
> history was filtered: the feature verifier's recorded test runs and some internal notes were left out. The owner's
> running copy of the site is behind a sign-in; only the [showcase page](https://ottomate.vault7a.xyz/showcase/) is public.

## Why it exists

The Ottomate skill is a set of instructions that guides Claude Code through building a web project. In long build
sessions with an AI, three things kept going wrong:

- The AI said a feature was finished when it was only a placeholder.
- It quietly dropped work it had agreed to do.
- Each new chat started from nothing, so it was hard to tell what was real, what was promised and what had shipped.

The fix is to keep each project's plan, progress and test results in this website, outside the chat. The skill works
from this record through an API, and it cannot mark its own work as done.

## What the website shows

- **Projects list.** One row per project with its stage (idea, spec, design, build or iterate), progress, health and
  links, plus recent activity across all projects.
- **Project page.** For each project:
  - an overview: what it does, how it is used, and what is next;
  - features, each with its acceptance criteria (the checks that define "done");
  - user flows (step-by-step paths through the app) and the pages they use, with their test status;
  - architecture diagrams, from the overall workflow down to the system design;
  - decisions: why things were built a certain way, including one change the reviewer sent back and how it was fixed.
- **Component library and inspirations.** Reusable UI components collected from past projects, grouped by category
  with live previews, and a gallery of design references. The skill draws on both when it plans a project's design.
- **Progress.** Which features are done, in progress or planned, and which flows have passed a test. An owner-only
  coverage page lists flows with no test as gaps, never as passes.

A video tour of the website is on the [showcase page](https://ottomate.vault7a.xyz/showcase/).

## How it keeps work honest

The skill does the talking and the coding. This website holds the record and decides what counts as done.

1. **You approve the list before anything is built.** The skill turns each request into a list of items and shows,
   for each one, how sure it is and which words of the request it came from. You edit the list, then lock it. The API
   will not lock it while an item the skill was unsure about has not been checked by you.
2. **A separate reviewer agent checks the code.** It is a different AI agent from the one that wrote the code. It
   reads the locked list and the code changes, not the coder's own report, and records a verdict: approve, send back,
   or block. The coding agent can report progress, but it cannot mark an item as verified or closed. In early November
   2026 the reviewer was sending back about one change in ten
   ([adr-025](decisions/adr-025-verifier-on-the-showcase.md)).
3. **A browser test checks the real app.** For projects that have one, a Playwright test (the "feature verifier")
   clicks through the running app as a person would and files its result here. The core of this test harness is in
   [`tests/e2e/feature-verify/`](tests/e2e/feature-verify/).
4. **The API refuses some writes.** For example, a feature cannot move to "building" without acceptance criteria, a
   round of changes cannot be closed while any item in it is still open, and dropping agreed work needs a written reason.
5. **Every write needs a token.** Reading is open, but every change through the API must carry a secret token.
   Without it the API answers "401 Unauthorized". If the database file is in an unsafe state, writes fail with an
   error instead of reporting a false success.

## Tech stack

- Next.js 16 (App Router), React 19 and TypeScript
- Tailwind CSS v4 and Radix UI components
- SQLite through better-sqlite3 and Drizzle ORM, with SQLite full-text search
- Zod, which checks every write against a schema
- Mermaid and React Flow for diagrams
- Vitest for API tests and Playwright for browser tests
- Docker; on the home server it sits behind a Cloudflare Tunnel and an Authentik sign-in

## Running it locally

It was built for one home server, but the app itself runs on a laptop with Node.js 22. These steps use a Unix shell
(macOS, Linux or WSL):

```bash
git clone https://github.com/pdsvardhan/ottomate-tracker.git
cd ottomate-tracker
npm install
mkdir data                                        # the SQLite file is created here
export TRACKER_API_TOKEN=$(openssl rand -hex 32)  # needed for every write
export OTTOMATE_DISABLE_WATCHER=true              # skips a watcher for home-server folders
npm run dev                                       # opens on http://localhost:3000
```

The database tables are created on first start. The database starts empty, because the owner's project data is not
in this repo. To add a project:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TRACKER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"demo-app","display_name":"Demo app"}'
```

`npm test` runs the Vitest API tests against a throwaway database under `/tmp`.

Some parts only work on the home server. Component previews are read from a folder on that server. `docker compose up`
will not run as written, because `docker-compose.yml` expects the server's Docker network, its storage folders and a
`.token` file.

## What's in this repo

| Folder or file | What it holds |
|---|---|
| `app/` | The website's pages, and the API under `app/api/` |
| `components/` | React components used by the pages |
| `lib/` | Database schema and migrations (`lib/db/`), token check, input validation, showcase logic |
| `tests/` | Vitest API tests, and Playwright browser tests in `tests/e2e/` |
| `scripts/` | Maintenance scripts: YAML backup of the database, component preview builder, API route list |
| `preview-sandbox/` | A separate workspace that bundles library components for their live previews |
| `decisions/` | Decision records (ADRs): short notes on why something was built a certain way |
| `public_docs/` | Short write-ups: the thesis, a technical deep-dive, validation and a retrospective |
| `ottomate/` | This project's own record, exported from the tracker as YAML (the tracker tracks itself) |
| `ARCHITECTURE.md` | How the skill, the website and the database fit together |
| `FEATURES.md` | The feature and flow list, generated from the tracker |

## Links

- Showcase page, with a video tour of this website: https://ottomate.vault7a.xyz/showcase/
- The Ottomate skill: https://github.com/pdsvardhan/ottomate-skill
- Author: Sai Vardhan Palli, https://www.linkedin.com/in/sai-vardhan-palli-3b1614187/
