#!/usr/bin/env tsx
// Seed the global risks catalog. Run once on first deploy.
// Source content: 06-tracker-v3-design/risks-catalog-seed.md

import { getDb, schema } from '../lib/db/client';

const SEED_RISKS = [
  // Auth & Access (8)
  { id: 'no-auth', name: 'No authentication required', description: 'Application has no auth — anyone with URL can access', severity_baseline: 'high', mitigation_patterns: 'Add Better Auth, NextAuth, Lucia, or platform SSO. For internal-only: rely on Cloudflare Tunnel auth or Tailscale.', detection_signals: 'No login page; no session middleware; routes accessible without credentials.', category: 'auth-access' },
  { id: 'temp-api-key', name: 'Temporary or shared API keys', description: 'API keys are placeholders, shared across environments, or rotated infrequently', severity_baseline: 'medium', mitigation_patterns: 'Use Infisical or vault. Set rotation cadence. One key per environment. Revoke on compromise.', detection_signals: 'Env vars named TEST_, TEMP_, DEMO_; same key in dev + prod; commits with API keys.', category: 'auth-access' },
  { id: 'weak-password-policy', name: 'Weak password policy', description: 'Passwords accepted without minimum length / complexity / breach check', severity_baseline: 'medium', mitigation_patterns: 'Enforce min 12 chars; check against haveibeenpwned API; require MFA for admin.', detection_signals: 'Auth logic with no min-length check.', category: 'auth-access' },
  { id: 'no-mfa', name: 'No multi-factor authentication', description: 'Auth relies solely on password; no second factor', severity_baseline: 'medium', mitigation_patterns: 'Add TOTP via Better Auth or Lucia. WebAuthn for premium UX.', detection_signals: 'Login flow has only password field.', category: 'auth-access' },
  { id: 'session-hijacking', name: 'Vulnerable to session hijacking', description: 'Session tokens insecure (no HttpOnly, no Secure, no SameSite)', severity_baseline: 'high', mitigation_patterns: 'Cookie flags: HttpOnly + Secure + SameSite=Lax. Short expiry. Rotate on privilege change.', detection_signals: 'Cookies set without flags; tokens in URL params.', category: 'auth-access' },
  { id: 'no-rate-limit-auth', name: 'No rate limiting on auth endpoints', description: 'Login/signup/password-reset endpoints can be brute-forced', severity_baseline: 'high', mitigation_patterns: 'Add rate limiter. 5 attempts per 15 min per IP.', detection_signals: 'No rate-limit middleware on /api/login.', category: 'auth-access' },
  { id: 'permissive-cors', name: 'Overly permissive CORS', description: 'CORS allows all origins (*) on sensitive endpoints', severity_baseline: 'medium', mitigation_patterns: 'Whitelist specific origins. Don\'t allow *.', detection_signals: 'Access-Control-Allow-Origin: * on auth/data endpoints.', category: 'auth-access' },
  { id: 'public-admin', name: 'Public admin panel', description: 'Admin routes reachable without proper RBAC', severity_baseline: 'critical', mitigation_patterns: 'Role check middleware on all /admin/* routes.', detection_signals: '/admin route renders without auth check.', category: 'auth-access' },

  // Secrets & Env (6)
  { id: 'leaked-secrets-git', name: 'Secrets committed to git history', description: 'API keys, passwords, tokens in committed code or history', severity_baseline: 'critical', mitigation_patterns: 'Rotate immediately. Use git-filter-repo to scrub history. Add .gitignore + pre-commit hook (gitleaks).', detection_signals: 'gitleaks scan finds matches.', category: 'secrets-env' },
  { id: 'public-secrets', name: 'Secrets exposed in client bundle', description: 'Server-only secrets leak into client-side JS (NEXT_PUBLIC_ misuse)', severity_baseline: 'critical', mitigation_patterns: 'Server-only env vars (no NEXT_PUBLIC_ prefix). Audit bundle.', detection_signals: 'Bundle inspection reveals env vars.', category: 'secrets-env' },
  { id: 'hardcoded-credentials', name: 'Hardcoded credentials in code', description: 'Passwords, tokens, connection strings literally in source', severity_baseline: 'critical', mitigation_patterns: 'Move to env vars. Use Infisical.', detection_signals: 'Static analysis finds string literals matching credential patterns.', category: 'secrets-env' },
  { id: 'no-secret-rotation', name: 'Secrets never rotated', description: 'Long-lived API keys / DB passwords without rotation policy', severity_baseline: 'medium', mitigation_patterns: 'Rotate on schedule (quarterly).', detection_signals: 'No rotation log.', category: 'secrets-env' },
  { id: 'env-file-in-repo', name: '.env file committed', description: 'Real .env (not .env.example) in git', severity_baseline: 'high', mitigation_patterns: 'Add .env to .gitignore; rotate any committed secrets.', detection_signals: 'git log -- .env returns commits.', category: 'secrets-env' },
  { id: 'shared-env-prod-dev', name: 'Same secrets across prod and dev', description: 'Production credentials used in development', severity_baseline: 'high', mitigation_patterns: 'Separate env files per environment.', detection_signals: 'Same DATABASE_URL in .env.local and .env.prod.', category: 'secrets-env' },

  // Data & Storage (10)
  { id: 'sql-injection', name: 'SQL injection vulnerable', description: 'User input concatenated into SQL queries', severity_baseline: 'critical', mitigation_patterns: 'Use parameterized queries (drizzle, prisma).', detection_signals: 'Code patterns: WHERE x = "${input}".', category: 'data-storage' },
  { id: 'no-input-validation', name: 'Missing input validation', description: 'API endpoints accept arbitrary input shapes', severity_baseline: 'high', mitigation_patterns: 'Validate every API input with zod schemas.', detection_signals: 'Route handlers without zod parsing.', category: 'data-storage' },
  { id: 'unencrypted-storage', name: 'Sensitive data stored unencrypted', description: 'PII, financial, or auth data in plaintext at rest', severity_baseline: 'high', mitigation_patterns: 'Encrypt at rest. Use bcrypt/argon2 for passwords.', detection_signals: 'Plaintext passwords in DB.', category: 'data-storage' },
  { id: 'unencrypted-transit', name: 'Data transmitted over HTTP (not HTTPS)', description: 'API or page traffic over plain HTTP', severity_baseline: 'high', mitigation_patterns: 'Force HTTPS. HSTS headers.', detection_signals: 'Endpoints reachable on port 80.', category: 'data-storage' },
  { id: 'no-backup', name: 'No backup strategy', description: 'DB / files without scheduled backups', severity_baseline: 'high', mitigation_patterns: 'Daily snapshot. Test restore quarterly.', detection_signals: 'No backup script in cron.', category: 'data-storage' },
  { id: 'data-retention-unclear', name: 'Data retention policy undefined', description: 'No policy for how long user data is kept', severity_baseline: 'medium', mitigation_patterns: 'Define per data type. Auto-purge.', detection_signals: 'No retention column on tables.', category: 'data-storage' },
  { id: 'no-deletion-pathway', name: 'No user data deletion pathway', description: 'Users cannot delete their own data', severity_baseline: 'medium', mitigation_patterns: 'GDPR-style "delete my account" endpoint.', detection_signals: 'No /account/delete route.', category: 'data-storage' },
  { id: 'pii-in-logs', name: 'PII in application logs', description: 'User emails, phone numbers, auth tokens logged', severity_baseline: 'medium', mitigation_patterns: 'Log middleware that scrubs known PII fields.', detection_signals: 'grep logs for @ symbols, "password".', category: 'data-storage' },
  { id: 'data-drift-undetected', name: 'Data drift / schema changes undetected', description: 'Source data changes shape silently breaking ingest', severity_baseline: 'medium', mitigation_patterns: 'Schema validation on ingest. Alert on column-count change.', detection_signals: 'No data-quality checks in ingest pipeline.', category: 'data-storage' },
  { id: 'orphan-data', name: 'Orphan rows after parent delete', description: 'Foreign-key relationships without cascade delete', severity_baseline: 'low', mitigation_patterns: 'CASCADE on FK definitions.', detection_signals: 'DB queries find rows referencing missing parents.', category: 'data-storage' },

  // API & External (8)
  { id: 'no-rate-limit', name: 'No rate limiting on public endpoints', description: 'Public APIs vulnerable to abuse / DoS', severity_baseline: 'medium', mitigation_patterns: 'Rate limit per IP.', detection_signals: 'No rate-limit middleware.', category: 'api-external' },
  { id: 'unbounded-query', name: 'Unbounded result sets', description: 'List endpoints return all rows (no pagination/limit)', severity_baseline: 'medium', mitigation_patterns: 'Always paginate. Default limit 50.', detection_signals: 'Endpoint returns 10k+ rows in one response.', category: 'api-external' },
  { id: 'third-party-uptime', name: 'No third-party fallback', description: 'Service breaks if external API is down', severity_baseline: 'medium', mitigation_patterns: 'Cache responses. Graceful degradation. Circuit breaker.', detection_signals: 'Service unavailable when external dependency fails.', category: 'api-external' },
  { id: 'no-retry-logic', name: 'No retry on transient failures', description: 'API calls fail on first error, no retry', severity_baseline: 'low', mitigation_patterns: 'Exponential backoff. Retry on 5xx + network errors.', detection_signals: 'Code: await fetch(...) without retry.', category: 'api-external' },
  { id: 'webhook-no-signature', name: 'Incoming webhooks unverified', description: 'Webhook endpoints accept requests without signature check', severity_baseline: 'high', mitigation_patterns: 'Verify HMAC signature against shared secret.', detection_signals: 'Webhook routes without crypto.verify() call.', category: 'api-external' },
  { id: 'unvalidated-redirects', name: 'Open redirect vulnerability', description: 'Redirect endpoint accepts arbitrary URL via param', severity_baseline: 'medium', mitigation_patterns: 'Whitelist destinations.', detection_signals: 'res.redirect(req.query.url) patterns.', category: 'api-external' },
  { id: 'csrf-vulnerable', name: 'CSRF protection missing', description: 'State-changing requests without CSRF token', severity_baseline: 'medium', mitigation_patterns: 'CSRF tokens on forms. SameSite=Lax cookies.', detection_signals: 'POST routes without CSRF middleware.', category: 'api-external' },
  { id: 'api-versioning-missing', name: 'No API versioning', description: 'API changes break consumers without notice', severity_baseline: 'low', mitigation_patterns: '/api/v1/, /api/v2/ paths.', detection_signals: 'No version in URL or response header.', category: 'api-external' },

  // UI & XSS (6)
  { id: 'xss-html-injection', name: 'XSS via HTML injection', description: 'User-supplied content rendered as HTML without sanitization', severity_baseline: 'high', mitigation_patterns: 'Use React/Vue auto-escape. DOMPurify for markdown.', detection_signals: 'dangerouslySetInnerHTML / v-html with user data.', category: 'ui-xss' },
  { id: 'xss-url-params', name: 'XSS via URL parameters reflected to page', description: 'Query params rendered without escaping', severity_baseline: 'high', mitigation_patterns: 'Use framework templating. Validate URL params with zod.', detection_signals: 'Direct interpolation of req.query into HTML.', category: 'ui-xss' },
  { id: 'no-csp', name: 'No Content Security Policy', description: 'Browser allows arbitrary scripts/styles', severity_baseline: 'medium', mitigation_patterns: 'Set CSP header.', detection_signals: 'No CSP header in response.', category: 'ui-xss' },
  { id: 'clickjacking', name: 'Clickjacking via iframe embedding', description: 'Site can be iframed by attacker page', severity_baseline: 'low', mitigation_patterns: 'X-Frame-Options: DENY or CSP frame-ancestors.', detection_signals: 'No X-Frame-Options.', category: 'ui-xss' },
  { id: 'a11y-missing', name: 'Accessibility issues', description: 'Site fails axe-core baseline', severity_baseline: 'medium', mitigation_patterns: 'Run axe-core in CI. Color contrast >= 4.5:1.', detection_signals: 'axe-core reports violations.', category: 'ui-xss' },
  { id: 'mobile-broken', name: 'Mobile-broken UI', description: 'Responsive breakpoints fail at common mobile widths', severity_baseline: 'medium', mitigation_patterns: 'Test at 375px, 414px, 768px.', detection_signals: 'Horizontal scroll at <500px width.', category: 'ui-xss' },

  // Performance & Reliability (8)
  { id: 'slow-page-load', name: 'Slow initial page load', description: 'TTI > 3s on typical connection', severity_baseline: 'medium', mitigation_patterns: 'Lighthouse CI. Bundle analysis.', detection_signals: 'Lighthouse perf score < 70.', category: 'performance' },
  { id: 'large-bundle', name: 'Excessive JS bundle size', description: 'JS payload > 200KB gzipped', severity_baseline: 'medium', mitigation_patterns: 'Code splitting. Tree-shake.', detection_signals: 'Bundle analysis shows >200KB main chunk.', category: 'performance' },
  { id: 'no-caching', name: 'No HTTP caching headers', description: 'Static assets served without cache control', severity_baseline: 'low', mitigation_patterns: 'Cache-Control: max-age. Cloudflare cache rules.', detection_signals: 'Network tab shows 200 (not 304) for same assets.', category: 'performance' },
  { id: 'no-error-tracking', name: 'No runtime error tracking', description: 'Errors in production not surfaced anywhere', severity_baseline: 'medium', mitigation_patterns: 'GlitchTip / Sentry self-hosted.', detection_signals: 'No error tracking SDK installed.', category: 'performance' },
  { id: 'no-monitoring', name: 'No uptime/health monitoring', description: 'Service can be down for hours unnoticed', severity_baseline: 'low', mitigation_patterns: 'Uptime Kuma. Alerts to phone.', detection_signals: 'No /health endpoint; no monitoring dashboard.', category: 'performance' },
  { id: 'memory-leak', name: 'Memory leak in long-running process', description: 'Process memory grows over time without bound', severity_baseline: 'medium', mitigation_patterns: 'Profile with heap snapshots.', detection_signals: 'Container OOM-killed.', category: 'performance' },
  { id: 'no-graceful-shutdown', name: 'No graceful shutdown', description: 'Container restart drops in-flight requests', severity_baseline: 'low', mitigation_patterns: 'SIGTERM handler. Drain connections.', detection_signals: 'Restart shows 502s for several seconds.', category: 'performance' },
  { id: 'no-feature-flags', name: 'No way to disable features at runtime', description: 'Bug requires redeploy to disable a feature', severity_baseline: 'low', mitigation_patterns: 'Feature flags table in DB.', detection_signals: 'Bugs always require new deploy to mitigate.', category: 'performance' },

  // Process & Maintenance (4)
  { id: 'no-tests', name: 'No automated tests', description: 'No unit, integration, or E2E tests', severity_baseline: 'high', mitigation_patterns: 'Add Playwright E2E for top user flows. Vitest for critical logic.', detection_signals: 'No tests/ folder; package.json test script absent.', category: 'process' },
  { id: 'no-ci', name: 'No CI/CD pipeline', description: 'Tests not run automatically; deploy manual', severity_baseline: 'medium', mitigation_patterns: 'Gitea Actions workflow on push.', detection_signals: 'No .gitea/workflows/ or .github/workflows/.', category: 'process' },
  { id: 'no-documentation', name: 'No setup or runbook docs', description: 'Future-you cannot understand how to run/deploy/debug', severity_baseline: 'low', mitigation_patterns: 'README with setup. Runbook for ops. ADRs for big choices.', detection_signals: 'README missing or trivial.', category: 'process' },
  { id: 'outdated-deps', name: 'Dependencies severely outdated', description: 'npm audit shows critical CVEs unpatched > 30 days', severity_baseline: 'medium', mitigation_patterns: 'Renovate self-hosted. Weekly review.', detection_signals: 'npm audit shows critical/high.', category: 'process' },
] as const;

async function main() {
  const db = await getDb();
  let inserted = 0;
  for (const risk of SEED_RISKS) {
    try {
      await db.insert(schema.risks_catalog).values(risk).onConflictDoNothing({ target: schema.risks_catalog.id });
      inserted++;
    } catch (err) {
      console.error(`Failed to insert ${risk.id}:`, err);
    }
  }
  console.log(`✅ Seeded ${inserted}/${SEED_RISKS.length} risk types`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
