// Feature-verify WORKED EXAMPLE (Task 3) — verifies Ottomate's own visual-QA import feature.
// Doubles as the dogfood proof: it drives the REAL import endpoint with real + nasty inputs and
// asserts SYSTEM STATE (the report_comments row's stored text via API + the screenshot bytes on
// disk), including the NFC/NFD unicode headline, then posts the case×outcome matrix to the sink.
//
// This is the pattern to copy for any feature: realise the matrix -> drive the real workflow ->
// assert the real effect (fs/DB-via-API/poll) -> record each case -> post report + flow rows.
//
// Env (see harness/config.ts): FV_INSTANCE_URL, FV_TRACKER_BASE, FV_BEARER_TOKEN, FV_PROJECT_SLUG,
// FV_RISK_POLICY, FV_EVIDENCE_ROOT, FV_ASSET_ROOT (fs root of /asset-library), FV_SESSION_ID.

import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import path from 'node:path';
import {
  loadConfig, Matrix, assertFileOnDisk, assertViaApi, assertNfcPreserved,
  SCRIPT_FIXTURES, NORMALIZATION_PAIR, caseEvidenceDir, saveArtifact, writeMatrix, postReport,
  type CaseResult,
} from './harness';

const cfg = loadConfig();
const matrix = new Matrix();

// A few bytes standing in for a screenshot — the import writes them verbatim, so real JPEG
// framing is irrelevant to the system-state assertion (we assert the stored bytes match).
const SHOT_B64 = Buffer.from('feature-verify-proof-bytes').toString('base64');
const SHOT_BYTES = Buffer.from(SHOT_B64, 'base64');

let api: APIRequestContext;
let reportId: number | null = null;
const authJson = { headers: { Authorization: `Bearer ${cfg.bearerToken}`, 'Content-Type': 'application/json' } };

test.beforeAll(async () => {
  api = await playwrightRequest.newContext();
});

test.afterAll(async () => {
  // Post the full case×outcome matrix + verdict to the feature-verifier sink.
  const verdict = matrix.verdict(cfg.riskPolicy);
  await postReport(api, cfg, { target_kind: 'stage-3-feature', target_id: 'feat-visual-qa-import', matrix, verdict });
  await writeMatrix(cfg.evidenceRoot, matrix.results, `# feature-verify: visual-qa-import\n\n${verdict.recommendation_overall} — ${verdict.reason}\n\n${matrix.renderTable()}\n`);

  // Clean up the disposable test report (rule 9). This is dogfood data, not a real batch.
  if (reportId !== null) {
    await api.delete(`${cfg.instanceUrl}/api/reports/${reportId}`, { ...authJson, data: {} });
  }
  await api.dispose();
});

// Import one comment and return the created report id (drives the real endpoint).
async function importComment(text: string, category: string, withShot: boolean): Promise<number> {
  const res = await api.post(`${cfg.instanceUrl}/api/projects/${cfg.projectSlug}/reports/import-visual-qa`, {
    ...authJson,
    data: {
      imported_by_session: cfg.verifierSessionId,
      comments: [{
        id: `fv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category, text, url: '/feature-verify', page: 'feature-verify',
        ...(withShot ? { screenshot_b64: SHOT_B64 } : {}),
      }],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = (await res.json()) as { report: { id: number } };
  return body.report.id;
}

// ── CASE 1 (happy): a plain comment persists a report + comment row + screenshot on disk ──
test('happy: import persists report row + screenshot bytes on disk', async () => {
  const dir = await caseEvidenceDir(cfg.evidenceRoot, 'happy-import');
  reportId = await importComment('The filter bar overlaps the header on load.', 'bug', true);

  // System state 1 — the DB row, read back INDEPENDENTLY via the app API (ONE DOOR).
  const rowCheck = await assertViaApi(api, `${cfg.instanceUrl}/api/reports/${reportId}`, (j: {
    comments: Array<{ text: string; screenshot_path: string | null }>;
  }) => {
    const c = j.comments[0];
    if (!c) return { ok: false, detail: 'no comment row persisted' };
    return { ok: c.text.includes('filter bar'), detail: `stored text: ${c.text}`, observed: c };
  });

  // System state 2 — the screenshot actually on disk with the exact bytes we sent.
  const shot = await assertViaApi(api, `${cfg.instanceUrl}/api/reports/${reportId}`, (j: {
    comments: Array<{ screenshot_path: string | null }>;
  }) => ({ ok: !!j.comments[0]?.screenshot_path, detail: j.comments[0]?.screenshot_path ?? 'no path' }));
  let fileCheck = { ok: false, detail: 'no assetRoot configured — skipped fs assertion' };
  if (cfg.assetRoot && shot.ok) {
    // shot.detail is the stored relative screenshot_path, e.g. visual-qa/<report_id>/<cid>.jpg
    fileCheck = await assertFileOnDisk(path.join(cfg.assetRoot, shot.detail), { exactBytes: SHOT_BYTES });
  }

  const result: CaseResult = {
    case: 'import persists report + screenshot', variant: 'happy',
    system_state: { row: rowCheck, file: fileCheck },
    outcome: rowCheck.ok && (fileCheck.ok || !cfg.assetRoot) ? 'pass' : (cfg.assetRoot ? 'fail' : 'warn'),
    evidence: { dir },
  };
  matrix.record(result);
  expect(rowCheck.ok, rowCheck.detail).toBeTruthy();
});

// ── CASE 2 (data / non-ASCII): Telugu+Tamil+emoji comment text survives, NFC, un-transliterated ──
test('data: non-ASCII comment text preserved (NFC, not transliterated)', async () => {
  const dir = await caseEvidenceDir(cfg.evidenceRoot, 'nonascii-text');
  const input = `${SCRIPT_FIXTURES.telugu} / ${SCRIPT_FIXTURES.tamil} / ${SCRIPT_FIXTURES.emoji}`;
  const rid = await importComment(input, 'content', false);

  const check = await assertViaApi(api, `${cfg.instanceUrl}/api/reports/${rid}`, (j: {
    comments: Array<{ text: string }>;
  }) => {
    const stored = j.comments[0]?.text ?? '';
    const u = assertNfcPreserved(stored, input);
    return { ok: u.ok, detail: u.detail, observed: { stored, ...u } };
  });
  await saveArtifact(dir, 'unicode.json', JSON.stringify(check.observed, null, 2));

  // Clean up this extra report immediately (case 1's report is the one afterAll deletes).
  await api.delete(`${cfg.instanceUrl}/api/reports/${rid}`, { ...authJson, data: {} });

  matrix.record({
    case: 'non-ASCII (Telugu+Tamil+emoji) text preserved', variant: 'data', axis: 'unicode-nfc',
    inputs: { input }, system_state: check.observed, outcome: check.ok ? 'pass' : 'fail', evidence: { dir },
  });
  expect(check.ok, check.detail).toBeTruthy();
});

// ── CASE 3 (data / NFD): does the app canonicalise NFD input to NFC? — the headline distinction ──
// The visual-QA import stores text VERBATIM, so an NFD input is preserved (codepoints intact,
// never a hard fail) but NOT canonicalised — surfaced as an advisory WARN. This shows the verifier
// catching the subtle NFC-vs-NFD behaviour a happy-path test never sees, without faking a bug.
test('data: NFD input preserved but not canonicalised (advisory warn)', async () => {
  const dir = await caseEvidenceDir(cfg.evidenceRoot, 'nfd-canonicalisation');
  const input = NORMALIZATION_PAIR.nfd; // "café" as e + U+0301
  const rid = await importComment(input, 'content', false);

  const check = await assertViaApi(api, `${cfg.instanceUrl}/api/reports/${rid}`, (j: {
    comments: Array<{ text: string }>;
  }) => {
    const stored = j.comments[0]?.text ?? '';
    const u = assertNfcPreserved(stored, input);
    return { ok: u.ok, detail: u.detail, observed: { stored, storedNfc: NORMALIZATION_PAIR.nfc, ...u } };
  });
  await saveArtifact(dir, 'nfd.json', JSON.stringify(check.observed, null, 2));
  await api.delete(`${cfg.instanceUrl}/api/reports/${rid}`, { ...authJson, data: {} });

  const canonical = (check.observed as { canonicalNfc: boolean }).canonicalNfc;
  matrix.record({
    case: 'NFD input canonicalised to NFC', variant: 'data', axis: 'unicode-normalisation',
    inputs: { form: 'NFD', text: input }, system_state: check.observed,
    // codepoints preserved but stored non-canonical → warn (would be pass only if the app canonicalises)
    outcome: !check.ok ? 'fail' : (canonical ? 'pass' : 'warn'), evidence: { dir },
  });
  // Codepoints must survive (hard); canonicalisation is advisory — assert only the hard part.
  expect(check.ok, check.detail).toBeTruthy();
});
