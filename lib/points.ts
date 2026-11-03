import type { Credit } from "./types";
export const pointCategories = ["PRT", "STANDARD", "HIGH_IMPACT"] as const;
export function pointTotals(
  credits: Credit[],
  cycleId: string,
  accountId: string,
) {
  const totals = { PRT: 0, STANDARD: 0, HIGH_IMPACT: 0 };
  for (const credit of credits)
    if (
      credit.account_id === accountId &&
      credit.cycle_id === cycleId &&
      !credit.revoked_at
    )
      totals[credit.category] += credit.points;
  return totals;
}
