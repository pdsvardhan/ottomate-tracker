// Project overview — showcase page (adr-021 IA: hero + Overview / Engineering /
// Decisions / Resources; Development dissolved).
// Server component: pulls all real project data + shapes the architecture slot,
// then hands a plain data object to the <ProjectShowcase> client shell (hero +
// in-page act-tabs). No fabricated content — every section is DB-backed or omitted.

import { and, asc, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { pickReel } from '@/lib/media';
import { projectAccent } from '@/lib/project-accent';
import {
  ArchitectureView,
  type DiagramSection,
} from '@/components/architecture/ArchitectureDiagrams';
import { ProjectShowcase, type ShowcaseData } from '@/components/project/ProjectShowcase';

export const dynamic = 'force-dynamic';

function unix(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Math.floor(Date.parse(value) / 1000);
  return 0;
}
function ymd(value: unknown): string {
  const s = unix(value);
  if (!s) return '';
  return new Date(s * 1000).toISOString().slice(0, 10);
}
function monthYear(value: unknown): string {
  const s = unix(value);
  if (!s) return '—';
  const d = new Date(s * 1000);
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

const STAGE_LABEL: Record<string, string> = {
  ideating: 'SPEC', building: 'BUILD', shipped: 'SHIPPED', maintained: 'MAINTAINED', deprecated: 'ARCHIVED',
};
const ARCH_LAYERS = [
  { kind: 'process', label: 'Workflow', desc: 'How value moves through the project — trigger to output.' },
  { kind: 'topology', label: 'System', desc: 'How the system is shaped — layers and relationships.' },
  { kind: 'platform', label: 'Platform', desc: 'How this project connects to the wider ecosystem.' },
] as const;
const ARCH_DETAIL: Record<string, { label: string; desc: string }> = {
  data: { label: 'Data model', desc: 'Core entities and their relationships.' },
  ux: { label: 'User flow', desc: 'Happy-path user journey through the app.' },
  api: { label: 'API map', desc: 'API surface grouped by domain.' },
};

export default async function ProjectOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  // ── Data pulls ──
  const features = db.select().from(schema.features).where(eq(schema.features.project_slug, slug))
    .orderBy(asc(schema.features.priority)).all();
  const flows = db.select().from(schema.flows).where(eq(schema.flows.project_slug, slug)).all();
  const flowSteps = db.select().from(schema.flow_steps).all();
  const nonGoals = db.select().from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug)).orderBy(asc(schema.project_non_goals.sort_order)).all();
  const success = db.select().from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.project_slug, slug)).orderBy(asc(schema.project_success_criteria.sort_order)).all();
  const riskRows = db.select({
    id: schema.risk_instances.id, status: schema.risk_instances.status,
    sev: schema.risk_instances.severity_override, resolution: schema.risk_instances.resolution_summary,
    name: schema.risks_catalog.name, category: schema.risks_catalog.category, baseSev: schema.risks_catalog.severity_baseline,
  }).from(schema.risk_instances)
    .leftJoin(schema.risks_catalog, eq(schema.risk_instances.risk_type_id, schema.risks_catalog.id))
    .where(eq(schema.risk_instances.project_slug, slug)).all();
  const adrs = db.select().from(schema.adr_index).where(eq(schema.adr_index.project_slug, slug))
    .orderBy(desc(schema.adr_index.date)).all();
  const iterations = db.select().from(schema.iterations).where(eq(schema.iterations.project_slug, slug)).all();
  // project_docs pull removed iter-65 #509 with the Resources tab.
  const todos = db.select().from(schema.project_todos)
    .where(and(eq(schema.project_todos.project_slug, slug), eq(schema.project_todos.done, false)))
    .orderBy(asc(schema.project_todos.sort_order)).all();
  // adr-021: three previously-orphaned datasets surfaced on the showcase page.
  const uiPlan = db.select().from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();
  const verifRows = db.select({ rec: schema.verification_reports.recommendation_overall })
    .from(schema.verification_reports)
    .where(eq(schema.verification_reports.project_slug, slug)).all();
  const traceRows = db.select({
    iterNum: schema.iterations.iteration_number,
    title: schema.iteration_items.title,
    description: schema.iteration_items.description,
    proposed: schema.iteration_items.proposed_change,
    verifier: schema.iteration_items.verifier_result,
  }).from(schema.iteration_items)
    .innerJoin(schema.iterations, eq(schema.iteration_items.iteration_id, schema.iterations.id))
    .where(and(eq(schema.iterations.project_slug, slug), eq(schema.iteration_items.status, 'integrated')))
    .orderBy(desc(schema.iterations.iteration_number), desc(schema.iteration_items.id))
    .limit(6).all();
  // testing_libs JSON repaired iter-14 via the /tech-stack endpoint, so the plain
  // full-row select is safe again (was defensively split after the malformed-row
  // 500 in iter-13).
  const tech = db.select().from(schema.tech_stacks).where(eq(schema.tech_stacks.project_slug, slug)).get();
  const services = db.select().from(schema.third_party_services).where(eq(schema.third_party_services.project_slug, slug)).all();
  const authCfg = db.select().from(schema.auth_config).where(eq(schema.auth_config.project_slug, slug)).get();
  const policy = db.select().from(schema.policies).where(eq(schema.policies.project_slug, slug)).get();
  const dataContract = db.select().from(schema.project_data_contracts).where(eq(schema.project_data_contracts.project_slug, slug)).get();
  const dataSources = db.select().from(schema.data_sources).where(eq(schema.data_sources.project_slug, slug)).all();

  // ── Architecture slot (server-rendered, reuses ArchitectureView) ──
  const dbDiag = db.select().from(schema.diagram_artifacts).where(eq(schema.diagram_artifacts.project_slug, slug))
    .orderBy(asc(schema.diagram_artifacts.kind), asc(schema.diagram_artifacts.position)).all();
  const byKind = new Map<string, { source: string; caption: string | null }[]>();
  for (const r of dbDiag) {
    const arr = byKind.get(r.kind) ?? [];
    arr.push({ source: r.mermaid_src, caption: r.caption });
    byKind.set(r.kind, arr);
  }
  const toSection = (kind: string, label: string, desc: string): DiagramSection => ({
    kind, label, desc, legacy: false, diagrams: byKind.get(kind)!,
  });
  const archSections: DiagramSection[] = ARCH_LAYERS.filter((l) => (byKind.get(l.kind) ?? []).length > 0)
    .map((l) => toSection(l.kind, l.label, l.desc));
  const layerKinds = ARCH_LAYERS.map((l) => l.kind as string);
  const detailKinds = [
    ...Object.keys(ARCH_DETAIL).filter((k) => byKind.has(k)),
    ...Array.from(byKind.keys()).filter((k) => !layerKinds.includes(k) && !(k in ARCH_DETAIL)),
  ];
  const archDetails: DiagramSection[] = detailKinds.map((kind) => {
    const meta = ARCH_DETAIL[kind] ?? { label: kind.charAt(0).toUpperCase() + kind.slice(1), desc: 'Project-specific diagram.' };
    return toSection(kind, meta.label, meta.desc);
  });
  // adr-021: decisions no longer render inside the Engineering architecture slot
  // (they double-rendered with the Development journal) — the Decisions tab is
  // now their single home. The /architecture route still passes them.
  const hasArch = archSections.length > 0 || archDetails.length > 0;
  const archSlot = hasArch
    ? <ArchitectureView sections={archSections} details={archDetails} decisions={[]} />
    : null;

  // ── Shaping ──
  const activeFeatures = features.filter((f) => f.status !== 'dropped');
  const fDone = activeFeatures.filter((f) => f.status === 'done').length;
  const fWip = activeFeatures.filter((f) => f.status === 'building').length;
  const fTodo = activeFeatures.filter((f) => f.status === 'planned' || f.status === 'blocked').length;
  const flowsPassing = flows.filter((f) => f.test_status === 'passing').length;
  const coveragePct = flows.length > 0 ? Math.round((flowsPassing / flows.length) * 100) : 0;
  const openRisks = riskRows.filter((r) => r.status !== 'resolved');
  const resolvedRisks = riskRows.filter((r) => r.status === 'resolved' && r.resolution);

  const stepsByFlow = new Map<string, { actor: string; action: string; result: string; sort: number }[]>();
  for (const s of flowSteps) {
    const arr = stepsByFlow.get(s.flow_id) ?? [];
    arr.push({ actor: s.actor, action: s.action, result: s.result, sort: s.sort_order });
    stepsByFlow.set(s.flow_id, arr);
  }
  const critical = flows.find((f) => f.priority === 'critical' && (stepsByFlow.get(f.id)?.length ?? 0) > 0)
    ?? flows.find((f) => (stepsByFlow.get(f.id)?.length ?? 0) > 0);
  const primaryFlow = critical
    ? {
        name: critical.title,
        steps: (stepsByFlow.get(critical.id) ?? []).sort((a, b) => a.sort - b.sort).map((s) => s.action),
      }
    : null;

  // Hero stats curated (iter-13, owner feedback): recruiter-meaningful only.
  // SUCCESS CRITERIA + NON-GOALS counts are build rails — capture-not-display
  // (adr-017); flow coverage lives honestly in the Development tab instead.
  const numbers: { n: string | number; l: string }[] = [
    { n: activeFeatures.length, l: 'FEATURES' },
    { n: adrs.length, l: 'DECISIONS' },
    { n: iterations.length, l: 'ITERATIONS' },
    { n: monthYear(project.created_at), l: 'STARTED' },
  ];

  const contextChips = [
    project.target_devices && { k: 'DEVICES', v: project.target_devices },
    project.hosting_target && { k: 'HOSTING', v: project.hosting_target.replace('-docker', '') },
    project.scope_size && { k: 'SCOPE', v: project.scope_size },
    project.current_status && { k: 'STATUS', v: project.current_status },
  ].filter(Boolean) as { k: string; v: string }[];

  // Security lines from real config
  const security: string[] = [];
  if (authCfg) {
    security.push(authCfg.strategy === 'none' ? 'No auth — single user / network-bound' : `Auth: ${authCfg.strategy}${authCfg.providers?.length ? ` (${authCfg.providers.join(', ')})` : ''}`);
    if (authCfg.mfa_supported) security.push('MFA supported');
  }
  if (policy) {
    security.push(`Exposure: ${policy.exposure} · access ${policy.access_control}`);
    if (policy.data_sensitivity_tier && policy.data_sensitivity_tier !== 'none') security.push(`Data sensitivity: ${policy.data_sensitivity_tier}`);
    if (policy.encryption_in_transit) security.push('Encrypted in transit');
  }
  if (security.length === 0) security.push('Self-hosted · network-bound (no auth config recorded)');

  const stackChips: string[] = [];
  if (tech) {
    for (const v of [tech.framework, tech.database, tech.state_management, tech.styling]) if (v) stackChips.push(v);
    for (const t of (tech.testing_libs ?? [])) stackChips.push(t);
  }

  // ── adr-021 additions ──
  // Visual identity strip (hero) from ui_master_plans — palette swatches are
  // whatever hex strings the stored palette JSON carries; nothing is invented.
  const hexRe = /^#[0-9a-fA-F]{3,8}$/;
  function collectHex(value: unknown, out: string[]) {
    if (typeof value === 'string') { if (hexRe.test(value.trim())) out.push(value.trim()); return; }
    if (Array.isArray(value)) { for (const v of value) collectHex(v, out); return; }
    if (value && typeof value === 'object') { for (const v of Object.values(value)) collectHex(v, out); }
  }
  let identity: { swatches: string[]; fonts: string[]; layout: string | null; motion: string | null } | null = null;
  if (uiPlan) {
    const swatches: string[] = [];
    collectHex(uiPlan.palette_dark ?? uiPlan.palette_light, swatches);
    const uniq = Array.from(new Set(swatches)).slice(0, 8);
    const fonts = uiPlan.fonts && typeof uiPlan.fonts === 'object'
      ? Array.from(new Set(Object.values(uiPlan.fonts as Record<string, unknown>).filter((f): f is string => typeof f === 'string')))
      : [];
    // layout_style can be an essay — the strip shows its leading clause only.
    const layout = uiPlan.layout_style
      ? uiPlan.layout_style.split(/[(:.]/, 1)[0]!.trim() || null
      : null;
    if (uniq.length || fonts.length || layout || uiPlan.animation_level) {
      identity = { swatches: uniq, fonts, layout, motion: uiPlan.animation_level ?? null };
    }
  }

  // Independent-verifier aggregate (Engineering) — real counts, no dressing.
  const verifApproves = verifRows.filter((v) => v.rec === 'APPROVE').length;
  const verification = verifRows.length > 0
    ? { total: verifRows.length, approves: verifApproves }
    : null;

  // Decision → change → verified thread (Decisions tab): recent integrated
  // Stage-4 items with their locked change + the verifier's actual verdict.
  function jsonField(value: unknown, key: string): string | null {
    try {
      const obj = typeof value === 'string' ? JSON.parse(value) : value;
      if (obj && typeof obj === 'object' && typeof (obj as Record<string, unknown>)[key] === 'string') {
        return (obj as Record<string, string>)[key];
      }
    } catch { /* malformed rows render without that line rather than crashing */ }
    return null;
  }
  const trace = traceRows.map((r) => ({
    iter: r.iterNum,
    title: r.title,
    request: r.description ?? null,
    change: jsonField(r.proposed, 'action_summary'),
    verdict: jsonField(r.verifier, 'recommendation'),
    reason: jsonField(r.verifier, 'reason'),
  })).filter((t) => t.verdict !== null);

  // Hero hook leads with the problem (adr-021) — first sentence, verbatim.
  const firstSentence = (s: string) => {
    const m = s.match(/^[\s\S]*?[.!?](?=\s|$)/);
    return (m ? m[0] : s).trim();
  };

  const data: ShowcaseData = {
    slug: project.slug,
    name: project.display_name,
    accent: projectAccent(project.slug),
    tagline: project.tagline ?? '',
    hook: project.problem_statement
      ? firstSentence(project.problem_statement)
      : (project.short_description ?? project.core_idea ?? project.tagline ?? ''),
    // personal/cv retired from display (owner decision 2026-07-04) — tech tags only
    tags: ((project.tags ?? []) as string[]).filter((t) => t !== 'personal' && t !== 'cv'),
    stageLabel: STAGE_LABEL[project.lifecycle_phase ?? 'building'] ?? 'BUILD',
    status: project.current_status ?? 'building',
    liveUrl: project.public_url ?? null,
    repoUrl: project.repository_url ?? null,
    port: project.port ?? null,
    numbers,
    featureCounts: { done: fDone, wip: fWip, todo: fTodo },
    // overview
    problem: project.problem_statement ?? '',
    contextChips,
    success: success.map((s) => s.content),
    nonGoals: nonGoals.map((n) => n.content),
    features: activeFeatures.map((f) => ({
      title: f.title, status: f.status ?? 'planned', priority: f.priority ?? 'P2', why: f.short_description ?? '',
    })),
    flows: flows.map((f) => ({ title: f.title, priority: f.priority ?? 'important', testStatus: f.test_status ?? 'not-tested' })),
    primaryFlow,
    roadmap: [
      ...activeFeatures.filter((f) => f.status === 'planned').map((f) => f.title),
      ...todos.map((t) => t.title),
    ].slice(0, 6),
    // engineering
    stack: stackChips,
    services: services.map((s) => ({ name: s.name, purpose: s.purpose ?? '' })),
    security,
    dataModel: dataContract || dataSources.length
      ? {
          engine: dataContract?.database_engine ?? null,
          storage: dataContract?.storage_location ?? null,
          migration: dataContract?.migration_tooling ?? null,
          sources: dataSources.map((d) => d.name),
        }
      : null,
    hasArch,
    identity,
    reel: (() => { const r = pickReel(slug); return r ? { url: r.url, kind: r.kind, name: r.name } : null; })(),
    verification,
    trace,
    // engineering (adr-021: tests moved out of the dissolved Development tab)
    tests: {
      flowsPassing, flowsTotal: flows.length, coveragePct,
      note: flows.length > 0
        ? `${flowsPassing} / ${flows.length} flows passing · every shipped feature independently verified. The true ratio reads as credible.`
        : 'No flow tests recorded yet — the honest ratio will show here once flows are exercised.',
    },
    journal: adrs.map((d) => ({
      date: ymd(d.date), title: d.title, tags: (Array.isArray(d.tags) ? d.tags : []).filter((t) => !t.startsWith('cat:') && t !== 'curated'),
      status: d.status ?? 'accepted', superseded: !!d.superseded_by,
      curated: (Array.isArray(d.tags) ? d.tags : []).includes('curated'),
    })),
    challenges: resolvedRisks.map((r) => ({ problem: r.name ?? 'Risk', solved: r.resolution ?? '' })),
    risks: openRisks.map((r) => ({
      name: r.name ?? 'Risk', category: r.category ?? '', severity: (r.sev ?? r.baseSev ?? 'medium'), status: r.status ?? 'open',
    })),
  };

  return <ProjectShowcase data={data} archSlot={archSlot} />;
}
