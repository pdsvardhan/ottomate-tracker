# adr-026: The showcase is public and read-only — private pages and every change stay behind sign-in and the bearer token

- Status: accepted · Date: 2026-11-04 (owner locked at the iteration-208 gate: "Lock all 9"; scope "as much as
  possible") · curated · cat:security
- Switch: prepared, not applied. The owner turns it on only when he decides to share the link.
- Amends: adr-002 (the internet path is no longer login-only for the showcase pages)

## Context

From the internet the whole of `ottomate.vault7a.xyz` sits behind the Authentik login, so a job reviewer given the
link sees a sign-in page. The tunnel routes the host to the Authentik proxy outpost; at home the owner reaches the
app over the LAN through NPM, with no Authentik in the path.

Opening pages was not the only problem. The root layout injected the bearer token into **every** page so the
owner's in-page controls could write; opening any page to the public would have handed every visitor the token.
Several public pages also carried owner controls (reel upload, rating, delete, "mark passing", add inspiration),
the grid's activity strip printed free-text notes, and one Next server action could be called from any path
without the token.

## Decision

1. **Public, read-only:** the projects grid, every project page and tab (Overview, Engineering, Decisions; features,
   flows and pages at `/capabilities`; `/architecture`), the components browser and inspirations, Next static
   assets, and only the GET API routes those pages fetch in the browser. Everything else stays behind the login:
   `/inbox`, `/coverage`, `/diagram-lab`, `/iterations/*`, `/search`, `/risks`, the owner-tool project pages
   (`/iterations`, `/design`, `/components-pick` under a project), and every other `/api` route.
2. **The Authentik unauthenticated-path rule** (Ottomate proxy provider → Unauthenticated Paths, one Go regex per
   line, matched against the path):

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

   The why of each line and the switch-on checklist: `docs/public-showcase-paths.md`.
3. **Owner view vs visitor view, one rule** (`lib/viewer.ts`): owner view = `x-authentik-username` present OR
   `cf-connecting-ip` absent; otherwise visitor view. The visitor view gets no bearer token (and any stored one is
   cleared), no owner controls, no drift banner, plain activity labels instead of notes, and only projects with at
   least one built feature.
4. **Every change still needs the bearer token.** Mutating API routes are unchanged (`requireBearer`). Authentik
   cannot filter by method, so the one matched API route with a write method (media DELETE) relies on that check.
   The server action refuses in the visitor view.
5. **What the public pages never render:** the inbox, raw verifier/report text from financial projects
   (adr-025), raw to-do text (only to-dos given a plain `showcase_title` appear under "What's next"), the
   event notes behind the activity strip, and a risk's free-text resolution (visitors see a risk's title,
   category and status only; the text is not even read for the visitor view).
6. **Ottomate's own live link follows the switch.** Until the switch is on and verified, outsiders get a redirect
   to the sign-in, so Ottomate is tagged `live:private` ("private app", no link). The last step of the switch-on
   checklist flips it to `live:public`; turning the switch off flips it back.

## Consequences

- A reviewer opens the link and sees the work, not a login page; the owner signed in, or at home, sees and edits
  everything as before.
- The visitor/owner split rests on two facts about the internet path: the outpost passes `cf-connecting-ip`
  through, and `X-authentik-username` is set only by Authentik. Right after switching on, confirm a plain
  anonymous request gets the visitor view and no token, and that a client cannot send `X-authentik-username` on
  an unauthenticated path; if it can, strip it at the Cloudflare edge (checklist steps 3–4).
- Every mutating route answers 401 without the token, proven route by route in `tests/mutation-auth.test.ts`
  (four routes that swallowed `requireBearer`'s 401 in a try/catch were fixed in iteration 208).
- Turning the switch off is one field in Authentik plus Ottomate's live tag; no code changes either way.
- The Engineering tab's security line for Ottomate now reads as this posture (policy exposure `public` + access
  `auth-required`), and the hero/grid draw repo and live links only where an outsider can open them.
