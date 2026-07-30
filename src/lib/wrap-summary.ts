// Pure wrap-milestone math (issue #12 acceptance criteria) — kept DB-free so
// it's unit-testable without a database, see wrap-summary.test.ts.

/** Null (not 0%) when nobody was ever invited — there's no rate to report, not a bad one. */
export function calculateAcceptanceRate(accepted: number, totalInvites: number): number | null {
  if (totalInvites === 0) return null;
  return Math.round((accepted / totalInvites) * 100);
}
