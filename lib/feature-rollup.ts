// Derive a feature's test_status from its linked flows — the "AND of linked flows"
// roll-up the coverage model documented but never computed. Pure helper so both the
// flow-test writer (cascade on each run) and the /api/coverage/recompute backfill
// share one derivation. A feature with NO linked flows keeps its stored value (there
// is nothing to derive from) rather than being forced to not-tested.
import { eq } from 'drizzle-orm';
import { schema, type DbClient } from '@/lib/db/client';

export type FeatureTestStatus = 'passing' | 'partial' | 'failing' | 'not-tested';

export function deriveFeatureStatus(
  flowStatuses: Array<string | null | undefined>,
): FeatureTestStatus {
  const s = flowStatuses.map((x) => x ?? 'not-tested');
  if (s.length === 0) return 'not-tested';
  if (s.includes('failing')) return 'failing';
  if (s.every((x) => x === 'passing')) return 'passing';
  if (s.some((x) => x === 'passing' || x === 'partial')) return 'partial';
  return 'not-tested';
}

export interface RollupResult {
  feature_id: string;
  linked_flows: number;
  test_status: FeatureTestStatus;
}

export function recomputeFeatureStatus(db: DbClient, featureId: string): RollupResult {
  const rows = db
    .select({ status: schema.flows.test_status })
    .from(schema.flow_features)
    .innerJoin(schema.flows, eq(schema.flows.id, schema.flow_features.flow_id))
    .where(eq(schema.flow_features.feature_id, featureId))
    .all();
  const test_status = deriveFeatureStatus(rows.map((r) => r.status));
  if (rows.length > 0) {
    db.update(schema.features)
      .set({ test_status })
      .where(eq(schema.features.id, featureId))
      .run();
  }
  return { feature_id: featureId, linked_flows: rows.length, test_status };
}

export function recomputeFeaturesForFlow(db: DbClient, flowId: string): RollupResult[] {
  const links = db
    .select({ feature_id: schema.flow_features.feature_id })
    .from(schema.flow_features)
    .where(eq(schema.flow_features.flow_id, flowId))
    .all();
  return links.map((l) => recomputeFeatureStatus(db, l.feature_id));
}

export function recomputeAllFeatures(db: DbClient): RollupResult[] {
  const feats = db.select({ id: schema.features.id }).from(schema.features).all();
  return feats.map((f) => recomputeFeatureStatus(db, f.id));
}
