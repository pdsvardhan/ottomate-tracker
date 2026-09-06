// Shared lock-precondition guard for stage-4 item endpoints (todo #239a).
//
// The bug this closes: build-status and verifier-result accepted writes while the iteration was
// still `awaiting-lock`. That let build progress — and even a verifier verdict — be recorded
// against items the user had not yet locked, which inverts the lock-in gate: the gate exists so
// that NOTHING is built before the user confirms what was extracted (bedrock rule 2, "lock before
// build"). An item that is already `verified` before the lock is a gate that ran after the fact.

export const PRE_LOCK_ITERATION_STATUSES = [
  'classification-pending',
  'awaiting-lock',
  'pending_user_review',
] as const;

export function isPreLock(status: string | null | undefined): boolean {
  return (PRE_LOCK_ITERATION_STATUSES as readonly string[]).includes(status ?? '');
}

export function preLockMessage(iterationId: number, status: string | null | undefined, endpoint: string): string {
  return (
    `Iteration ${iterationId} is not locked yet (status='${status}'). ` +
    `${endpoint} may not be used before the lock-in gate — lock the items first via ` +
    `POST /api/iterations/${iterationId}/lock. Bedrock rule 2: lock before build.`
  );
}
