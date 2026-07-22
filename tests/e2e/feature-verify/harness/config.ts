// Feature-verify harness — config (Task 3). Read from env so one spec set runs against the
// live instance, the disposable :3100, or a target project unchanged. No secrets in code.
//
// A TARGET project drives its own app (INSTANCE_URL) but posts the report to the Ottomate
// tracker (TRACKER_BASE). For Ottomate dogfooding itself, the two are the same origin.

export interface FeatureVerifyConfig {
  /** The running app the specs DRIVE + assert system state against (its own API). */
  instanceUrl: string;
  /** The Ottomate tracker the report is POSTed to (usually http://127.0.0.1:8110). */
  trackerBase: string;
  /** Bearer for mutations on instance + tracker (server-side /opt/homeserver/ottomate/.token). */
  bearerToken: string;
  /** Project slug the report is filed under. */
  projectSlug: string;
  /** adr-014 policy: block (cv/public) → red halts ; warn (personal) → red surfaces only. */
  riskPolicy: 'block' | 'warn';
  /** Absolute dir for this run's evidence (trace/video/screenshots/matrix.json). */
  evidenceRoot: string;
  /** Optional fs root for on-disk assertions (e.g. /asset-library) — project-specific. */
  assetRoot?: string;
  /** The commit under test, for trend correlation. */
  commitSha?: string;
  verifierSessionId: string;
}

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`feature-verify: missing env ${name}`);
  return v;
}

export function loadConfig(): FeatureVerifyConfig {
  const instanceUrl = req('FV_INSTANCE_URL', 'http://127.0.0.1:8110');
  return {
    instanceUrl,
    trackerBase: req('FV_TRACKER_BASE', 'http://127.0.0.1:8110'),
    bearerToken: req('FV_BEARER_TOKEN'),
    projectSlug: req('FV_PROJECT_SLUG'),
    riskPolicy: (process.env.FV_RISK_POLICY as 'block' | 'warn') ?? 'block',
    evidenceRoot: req('FV_EVIDENCE_ROOT', `/tmp/feature-verify/${Date.now()}`),
    assetRoot: process.env.FV_ASSET_ROOT || undefined,
    commitSha: process.env.FV_COMMIT_SHA || undefined,
    verifierSessionId: req('FV_SESSION_ID', `fv-${Date.now()}`),
  };
}
