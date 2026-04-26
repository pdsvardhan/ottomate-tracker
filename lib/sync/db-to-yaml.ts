// DB → YAML serialization for the 7 SO1 docs.
// Tracker is the canonical store; YAML mirrors give a project repo
// narrative + git history. Codex P0 #2 — backup-before-overwrite is
// the caller's responsibility.

import { stringify } from 'yaml';
import { asc, eq } from 'drizzle-orm';
import type Database from 'better-sqlite3';
import { getDb, schema } from '@/lib/db/client';

type ProjectRow = typeof schema.projects.$inferSelect;

function dropNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export interface YamlMirror {
  doc: string;
  filename: string;
  body: string;
  hash: string;
}

async function fnv1a(input: string): Promise<string> {
  // Simple, deterministic hash for drift detection.
  // We don't need crypto-strong; we just need stable.
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export async function buildAllMirrors(slug: string): Promise<YamlMirror[]> {
  const db = await getDb();
  const project = db.select().from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) throw new Error(`Project '${slug}' not found`);

  const out: YamlMirror[] = [];
  out.push(await buildOverview(slug, project));
  out.push(await buildFlows(slug));
  out.push(await buildFeatures(slug));
  out.push(await buildPages(slug));
  out.push(await buildData(slug));
  out.push(await buildRisks(slug));
  out.push(await buildDecisions(slug));
  return out;
}

async function buildOverview(slug: string, project: ProjectRow): Promise<YamlMirror> {
  const db = await getDb();
  const non_goals = db.select({ content: schema.project_non_goals.content })
    .from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug))
    .orderBy(asc(schema.project_non_goals.sort_order)).all();
  const success_criteria = db.select({ content: schema.project_success_criteria.content })
    .from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.project_slug, slug))
    .orderBy(asc(schema.project_success_criteria.sort_order)).all();

  const body = stringify({
    slug: project.slug,
    display_name: project.display_name,
    summary: dropNullish({
      tagline: project.tagline,
      short_description: project.short_description,
      core_idea: project.core_idea,
    }),
    current_status: project.current_status,
    lifecycle_phase: project.lifecycle_phase,
    scope_size: project.scope_size,
    target_devices: project.target_devices,
    hosting_target: project.hosting_target,
    port: project.port,
    public_url: project.public_url,
    repository_url: project.repository_url,
    problem_statement: project.problem_statement,
    non_goals: non_goals.map((n) => n.content),
    success_criteria: success_criteria.map((s) => s.content),
    preferences: project.preferences ?? null,
    tags: project.tags ?? [],
  });
  return { doc: 'overview', filename: 'ottomate/overview.yaml', body, hash: await fnv1a(body) };
}

async function buildFlows(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const flows = db.select().from(schema.flows)
    .where(eq(schema.flows.project_slug, slug)).all();
  const out = flows.map((f) => {
    const steps = db.select().from(schema.flow_steps)
      .where(eq(schema.flow_steps.flow_id, f.id))
      .orderBy(asc(schema.flow_steps.sort_order)).all();
    const pre_conditions = db.select().from(schema.flow_pre_conditions)
      .where(eq(schema.flow_pre_conditions.flow_id, f.id))
      .orderBy(asc(schema.flow_pre_conditions.sort_order)).all();
    const edge_cases = db.select().from(schema.flow_edge_cases)
      .where(eq(schema.flow_edge_cases.flow_id, f.id))
      .orderBy(asc(schema.flow_edge_cases.sort_order)).all();
    const linked_features = db.select({ feature_id: schema.flow_features.feature_id })
      .from(schema.flow_features).where(eq(schema.flow_features.flow_id, f.id)).all();
    const linked_pages = db.select({ page_id: schema.flow_pages.page_id })
      .from(schema.flow_pages).where(eq(schema.flow_pages.flow_id, f.id)).all();
    return dropNullish({
      id: f.id,
      parent_id: f.parent_id,
      title: f.title,
      type: f.type,
      priority: f.priority,
      test_status: f.test_status,
      trigger: f.trigger,
      expected_outcome: f.expected_outcome,
      linked_playwright_test: f.linked_playwright_test,
      notes: f.notes,
      pre_conditions: pre_conditions.map((p) => p.content),
      steps: steps.map((s) => ({ actor: s.actor, action: s.action, result: s.result })),
      edge_cases: edge_cases.map((e) => e.content),
      linked_features: linked_features.map((l) => l.feature_id),
      linked_pages: linked_pages.map((l) => l.page_id),
    });
  });
  const body = stringify({ flows: out });
  return { doc: 'flows', filename: 'ottomate/flows.yaml', body, hash: await fnv1a(body) };
}

async function buildFeatures(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug)).all();
  const out = features.map((f) => {
    const ac = db.select().from(schema.feature_acceptance_criteria)
      .where(eq(schema.feature_acceptance_criteria.feature_id, f.id))
      .orderBy(asc(schema.feature_acceptance_criteria.sort_order)).all();
    const deps = db.select({ d: schema.feature_dependencies.depends_on_feature_id })
      .from(schema.feature_dependencies)
      .where(eq(schema.feature_dependencies.feature_id, f.id)).all();
    return dropNullish({
      id: f.id,
      parent_id: f.parent_id,
      title: f.title,
      short_description: f.short_description,
      type: f.type,
      status: f.status,
      priority: f.priority,
      size: f.size,
      test_status: f.test_status,
      notes: f.notes,
      acceptance_criteria: ac.map((c) => ({
        content: c.content,
        test_status: c.test_status,
        linked_test: c.linked_test,
      })),
      dependencies: deps.map((d) => d.d),
    });
  });
  const body = stringify({ features: out });
  return { doc: 'features', filename: 'ottomate/features.yaml', body, hash: await fnv1a(body) };
}

async function buildPages(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug)).all();
  const out = pages.map((p) => {
    const components = db.select().from(schema.components)
      .where(eq(schema.components.page_id, p.id)).all();
    const componentsOut = components.map((c) => {
      const variants = db.select().from(schema.component_variants)
        .where(eq(schema.component_variants.component_id, c.id))
        .orderBy(asc(schema.component_variants.sort_order)).all();
      return dropNullish({
        name: c.name,
        purpose_on_page: c.purpose_on_page,
        category: c.category,
        data_consumed: c.data_consumed,
        data_produced: c.data_produced,
        picked: c.picked,
        asset_library_ref: c.asset_library_ref,
        variants: variants.map((v) => v.variant_name),
      });
    });
    const entry_points = db.select().from(schema.page_entry_points)
      .where(eq(schema.page_entry_points.page_id, p.id)).all();
    return dropNullish({
      id: p.id,
      title: p.title,
      route: p.route,
      purpose: p.purpose,
      layout_type: p.layout_type,
      empty_state: p.empty_state,
      loading_state: p.loading_state,
      error_state: p.error_state,
      permissions: p.permissions,
      mobile_handling: p.mobile_handling,
      entry_points: entry_points.map((e) => e.content),
      components: componentsOut,
    });
  });
  const body = stringify({ pages: out });
  return { doc: 'pages', filename: 'ottomate/ui.yaml', body, hash: await fnv1a(body) };
}

async function buildData(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const concepts = db.select().from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();
  const sources = db.select().from(schema.data_sources)
    .where(eq(schema.data_sources.project_slug, slug)).all();
  const contracts = db.select().from(schema.project_data_contracts)
    .where(eq(schema.project_data_contracts.project_slug, slug)).get();
  const body = stringify({
    conceptual: concepts ? dropNullish(concepts) : null,
    sources: sources.map((s) => dropNullish(s)),
    contract: contracts ? dropNullish(contracts) : null,
  });
  return { doc: 'data', filename: 'ottomate/data.yaml', body, hash: await fnv1a(body) };
}

async function buildRisks(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const instances = db.select().from(schema.risk_instances)
    .where(eq(schema.risk_instances.project_slug, slug)).all();
  const policy = db.select().from(schema.policies)
    .where(eq(schema.policies.project_slug, slug)).get();
  const auth = db.select().from(schema.auth_config)
    .where(eq(schema.auth_config.project_slug, slug)).get();
  const services = db.select().from(schema.third_party_services)
    .where(eq(schema.third_party_services.project_slug, slug)).all();
  const secrets = db.select().from(schema.project_secrets)
    .where(eq(schema.project_secrets.project_slug, slug)).all();
  const body = stringify({
    risks: instances.map((r) => dropNullish(r)),
    policy: policy ? dropNullish(policy) : null,
    auth_config: auth ? dropNullish(auth) : null,
    third_party_services: services.map((s) => dropNullish(s)),
    secrets: secrets.map((s) => dropNullish(s)),
  });
  return { doc: 'risks', filename: 'ottomate/risks.yaml', body, hash: await fnv1a(body) };
}

async function buildDecisions(slug: string): Promise<YamlMirror> {
  const db = await getDb();
  const decisions = db.select().from(schema.adr_index)
    .where(eq(schema.adr_index.project_slug, slug)).all();
  const body = stringify({
    decisions: decisions.map((d) => dropNullish(d)),
  });
  return { doc: 'decisions', filename: 'ottomate/decisions/index.yaml', body, hash: await fnv1a(body) };
}

export async function recordMirrorHashes(
  sqlite: Database.Database,
  slug: string,
  mirrors: YamlMirror[],
): Promise<void> {
  // Persist sync state for drift detection (Codex P0 #2).
  const upsert = sqlite.prepare(`
    INSERT INTO yaml_mirror_state (project_slug, doc_name, last_db_version, last_synced_at, last_yaml_hash)
    VALUES (@project_slug, @doc_name, @last_db_version, @last_synced_at, @last_yaml_hash)
    ON CONFLICT(project_slug, doc_name) DO UPDATE SET
      last_db_version = excluded.last_db_version,
      last_synced_at = excluded.last_synced_at,
      last_yaml_hash = excluded.last_yaml_hash
  `);
  const now = Math.floor(Date.now() / 1000);
  for (const m of mirrors) {
    upsert.run({
      project_slug: slug,
      doc_name: m.doc,
      last_db_version: now,
      last_synced_at: now,
      last_yaml_hash: m.hash,
    });
  }
}
