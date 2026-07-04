// zod schema for the tech_stacks upsert (iter-14 follow-up — added so the stack
// column can be backfilled from repo package.json / requirements without a
// second SQLite client, ONE DOOR adr-018). All fields optional; testing_libs is
// a JSON string[].

import { z } from 'zod';

export const TechStackUpsertSchema = z.object({
  framework: z.string().max(120).nullish(),
  database: z.string().max(120).nullish(),
  state_management: z.string().max(120).nullish(),
  styling: z.string().max(120).nullish(),
  testing_libs: z.array(z.string().max(60)).max(24).nullish(),
});

export type TechStackUpsert = z.infer<typeof TechStackUpsertSchema>;
