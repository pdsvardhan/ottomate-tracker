# Public showcase: the Authentik unauthenticated-path list

As of 2026-11-04 (iteration 208, item 1509). Decision record: `decisions/adr-026-public-read-only-showcase.md`.

**Status: prepared, not applied.** The owner switches it on only when he decides to share the link.
Until then every path on `ottomate.vault7a.xyz` stays behind the Authentik login, exactly as today.

## Where it goes

The tunnel routes `ottomate.vault7a.xyz` to `http://authentik:9000` (`appdata/cloudflared/config.yml`), so the
gate is the Authentik **proxy provider** for Ottomate, not an NPM forward-auth block (NPM host 40 serves the LAN
path straight to the app and has no Authentik config).

Authentik admin → Applications → Providers → the Ottomate proxy provider → *Advanced protocol settings* →
**Unauthenticated Paths**. One regular expression per line (Go RE2). In proxy mode each line is matched against
the request **path** (no query string), so `?_rsc=…` prefetches and `?q=…` searches match their page.

## The list (paste exactly)

```text
^/$
^/projects/[^/]+/?$
^/projects/[^/]+/(capabilities|architecture)/?$
^/components-browser/?$
^/components-browser/[^/]+/?$
^/inspirations/?$
^/inspirations/[^/]+/?$
^/_next/static/.+$
^/favicon\.ico$
^/api/projects/[^/]+/media/[^/]+$
^/api/previews/.+$
^/api/inspirations/[^/]+/thumbnail$
```

| Line | What it opens | Why |
|---|---|---|
| `^/$` | The projects grid | Home page |
| `^/projects/[^/]+/?$` | Every project page and its tabs (Overview, Engineering, Decisions) | The tabs are in-page, one URL |
| `^/projects/[^/]+/(capabilities\|architecture)/?$` | Features, flows and pages (`/capabilities`); architecture | The rest of "every project page and tab" |
| `^/components-browser/?$`, `^/components-browser/[^/]+/?$` | Components browser and each component | Owner scope |
| `^/inspirations/?$`, `^/inspirations/[^/]+/?$` | Inspirations and each inspiration | Owner scope |
| `^/_next/static/.+$` | Next.js JS/CSS chunks and self-hosted fonts | Every page needs them |
| `^/favicon\.ico$` | The browser's automatic favicon request | Keeps it from bouncing to the login |
| `^/api/projects/[^/]+/media/[^/]+$` | Reel image/video on the grid pop-over and the project hero | `lib/media.ts` builds these URLs; fetched by `<img>`/`<video>` in the browser |
| `^/api/previews/.+$` | Component poster `shot.png` and the live-preview iframe bundle | `app/components-browser/page.tsx`, `LivePreview.tsx` |
| `^/api/inspirations/[^/]+/thumbnail$` | Inspiration thumbnails | Every stored `thumbnail_url` points here |

These are the only API routes the public pages fetch **in the browser** (found by reading every client component
and every `src=`/`fetch(` on the public pages). The pages themselves read the database on the server, so no other
`/api` route needs to be public.

## What stays behind the login

Everything the list does not match, including: `/inbox`, `/coverage`, `/diagram-lab`, `/iterations/*`, `/search`,
`/risks`, the owner-tool project pages `/projects/<slug>/iterations`, `/projects/<slug>/design/*` and
`/projects/<slug>/components-pick`, and every other `/api` route (`/api/inbox`, `/api/verification-reports`,
`/api/reports`, `/api/skill-events`, `/api/iterations/*`, …).

No public page links into a private one: the only links to `/inbox` and `/iterations/*` are on
`/projects/<slug>/iterations`, which is itself private.

## Changes still need the bearer token

- Authentik cannot limit a path by HTTP method. Of the matched API routes only `/api/projects/<slug>/media/<file>`
  has a non-GET method (DELETE), and it calls `requireBearer`. Every mutating route requires the bearer token
  (`docs/api-inventory.md`).
- The token is injected into the page **only in the owner view** (`app/layout.tsx`); the visitor view gets no
  token, and `TokenInjector` clears any stored one.
- The one Next server action (`requestSiteVerify`) can be POSTed to any page path, so it refuses in the visitor
  view (`app/coverage/actions.ts`).

## Owner view vs visitor view

`lib/viewer.ts`: **owner view = `x-authentik-username` present OR `cf-connecting-ip` absent; otherwise visitor
view.** Signed in through the tunnel → owner. From home over the LAN (NPM straight to the app, no Cloudflare
header) → owner. Anonymous through the tunnel → visitor.

## Checklist for switching it on

1. Deploy the branch that carries this file (the to-do marker migration 0016 applies at boot).
2. **Make sure a visitor cannot send `X-authentik-username` themselves.** On an unauthenticated path nobody
   signs in, so if the outpost passes a client-supplied `X-authentik-username` through, a visitor could claim
   the owner view (and with it the bearer token). Check it on the server once the list is live (the request
   goes out through Cloudflare and back in through the tunnel):
   `curl -s -H 'X-authentik-username: x' https://ottomate.vault7a.xyz/projects/ottomate | grep -c "$(cat /opt/homeserver/ottomate/.token)"`
   must print `0` (the token value appears in a page only in the owner view). If it is not `0`, add a
   Cloudflare Transform Rule (Modify Request Header → *Remove* `x-authentik-username`, hostname
   `ottomate.vault7a.xyz`) — Authentik re-adds the header for real sessions after that.
3. Paste the list above into the provider and save.
4. From outside the LAN, without cookies: `/`, `/projects/ottomate`, `/components-browser` return 200;
   `/inbox`, `/coverage`, `/iterations/1` and `/api/inbox` redirect to the outpost; `POST /api/projects` without
   the token is refused.
5. Set Ottomate's live tag to match: it is stored as `live:public` already because the showcase is only visible
   to outsiders once this switch is on.

**Turning it off:** clear the Unauthenticated Paths field and save. Nothing in the app needs to change.

## Live-site reachability tags (item 1511)

Each project carries one `live:*` tag in `projects.tags`: `live:public` (link), `live:private` ("private app"
label, no link), `live:none` (nothing). Update with
`PATCH /api/projects/<slug>` `{"tags": [<all existing tags>, "live:public"]}` — `tags` is replaced whole, so send
the existing tags too.
