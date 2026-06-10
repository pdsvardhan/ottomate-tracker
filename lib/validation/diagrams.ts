// zod schema for diagram_artifacts upserts (Architecture tab Mermaid sources).
// Column names mirror the table: mermaid_src / caption / position.
// `title` has no column of its own — by seed convention (0006) it is folded
// into the stored caption as "Title — caption" (title alone when no caption).

import { z } from 'zod';

export const diagramKindEnum = z.enum(['process', 'topology', 'data', 'ux', 'api']);
export type DiagramKind = z.infer<typeof diagramKindEnum>;

export const DiagramUpsertSchema = z.object({
  kind: diagramKindEnum,
  title: z.string().min(1).max(200),
  mermaid_src: z.string().min(20),
  caption: z.string().min(1).max(500).optional(),
  position: z.number().int().min(0).optional(),
});
