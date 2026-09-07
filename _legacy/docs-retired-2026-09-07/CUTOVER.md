# Cutover Plan — v2 → ottomate

When Phase 1-12 done, switch from old tracker (port 8100) to new ottomate (port 8110). One-shot cutover with rollback path.

## Pre-cutover checklist

- [ ] All 3 pilot projects onboarded successfully (ottomate-self, BOTB, tasks)
- [ ] All migration projects onboarded (Phase 11)
- [ ] Codex Round 3 review complete (Phase 12)
- [ ] Tracker DB backed up: `POST /api/backup` returns success
- [ ] Skill v2 plugin tested against all 3 pilots end-to-end
- [ ] Tasks-dashboard untouched (verify port 8507 still responds)
- [ ] No open BLOCK-level verifier reports

## Cutover steps (in order, ~30 min total)

### 1. DNS prep (5 min)
- [ ] Cloudflare: add CNAME `ottomate.vault7a.xyz` → `<tunnel-id>.cfargotunnel.com`
- [ ] Verify DNS propagates: `dig ottomate.vault7a.xyz`

### 2. Cloudflared tunnel ingress (5 min)
- [ ] Edit `/opt/homeserver/docker-compose/cloudflared/config.yml`
- [ ] Add ingress rule:
  ```yaml
  ingress:
    - hostname: ottomate.vault7a.xyz
      service: http://npm:80    # NPM proxy handles internal routing
    # ... existing rules ...
  ```
- [ ] Restart cloudflared: `docker compose -f /opt/homeserver/docker-compose/cloudflared.yml restart`

### 3. NPM proxy host (5 min)
- [ ] NPM admin UI at `http://192.168.1.10:81`
- [ ] Add proxy host:
  - Domain: `ottomate.vault7a.xyz`
  - Forward IP: `ottomate` (container name on `projects-net`)
  - Forward port: `3000`
  - Cert: wildcard cert ID 2
  - Force SSL: yes
  - HTTP/2: yes

### 4. Bring up new tracker (5 min)
- [ ] `cd /opt/homeserver/ottomate && docker compose up -d --build`
- [ ] Verify health: `curl https://ottomate.vault7a.xyz/api/health`
- [ ] Expected: `{"status":"ok","db":"connected", ...}`

### 5. Plugin swap (5 min)
- [ ] On Windows machine:
  ```bash
  mv ~/.claude/plugins/ottomate ~/.claude/plugins/ottomate-old-v1
  mv ~/.claude/plugins/ottomate-v2 ~/.claude/plugins/ottomate
  ```
- [ ] Restart Claude Code to reload plugins
- [ ] Verify `/ottomate` works (sample any project)

### 6. Old tracker decommission (5 min)
- [ ] Update `/opt/homeserver/docker-compose/tracker.yml` (or wherever tracker-v2 lives) — comment out service or change port to 8100→8100-deprecated
- [ ] NPM: change `tracker.vault7a.xyz` to redirect to `ottomate.vault7a.xyz` (301)
- [ ] OR: leave v2 running for emergency rollback for 1-2 weeks

### 7. Verify (5 min)
- [ ] Visit `https://ottomate.vault7a.xyz` — should show new tracker
- [ ] Sample a project's detail page — verify SO1 data loaded
- [ ] Submit a test bug report on any project — verify Stage 4 flow
- [ ] Pack up a session — verify YAML mirrors written

## Rollback plan (if cutover breaks)

If anything goes wrong:

1. **Plugin rollback:**
   ```bash
   mv ~/.claude/plugins/ottomate ~/.claude/plugins/ottomate-failed
   mv ~/.claude/plugins/ottomate-old-v1 ~/.claude/plugins/ottomate
   # Restart Claude Code
   ```

2. **NPM rollback:** revert `ottomate.vault7a.xyz` proxy host or keep it inactive; `tracker.vault7a.xyz` proxy host still pointing to v2 (port 8100).

3. **Tracker rollback:**
   ```bash
   cd /opt/homeserver/ottomate && docker compose down
   # Old tracker (v2) still running on port 8100; users continue with tracker.vault7a.xyz
   ```

4. **DB rollback:** N/A — both databases are independent. v2 DB at `/opt/homeserver/tracker-v2/data/` untouched.

## Post-cutover (1 week)

- [ ] Daily: check `/api/health` responds + run a small task in tracker
- [ ] Day 3: review verifier reports for any stub-detected events
- [ ] Day 7: if stable, decommission v2 fully (delete `/opt/homeserver/tracker-v2/data/`, deactivate NPM v2 proxy host)
- [ ] Day 7: archive `~/.claude/plugins/ottomate-old-v1` to long-term storage; remove from active plugin dir

## Post-cutover (1 month)

- [ ] Quarterly review: bearer token rotation
- [ ] Backup verification: restore from snapshot to a temp container, confirm data integrity
- [ ] Codex Round 4 review (optional polish pass)

## What v2 keeps (forever)

- Git history at `git.vault7a.xyz/pdsv/ottomate-tracker` (v2 repo) — preserved as historical record
- DB snapshot at `/opt/homeserver/tracker-v2/backups/<final-snapshot-date>.db`
- Plugin at `~/.claude/plugins/ottomate-old-v1/` — local archive
