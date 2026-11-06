export type AccountState =
  "ACTIVE" | "AWAITING_SETUP" | "SETUP_EXPIRED" | "DISABLED";
type AccountStateTone = "green" | "neutral" | "amber";
const SETUP_PENDING_STATES: readonly AccountState[] = [
  "AWAITING_SETUP",
  "SETUP_EXPIRED",
];
export const ACCOUNT_STATE_SQL =
  "CASE WHEN NOT a.enabled THEN 'DISABLED' WHEN a.password_hash IS NOT NULL THEN 'ACTIVE' WHEN EXISTS(SELECT 1 FROM activation_tokens t WHERE t.account_id=a.id AND t.expires_at>now()) THEN 'AWAITING_SETUP' ELSE 'SETUP_EXPIRED' END account_state";
export const NEEDS_SETUP_SQL = `account_state IN (${SETUP_PENDING_STATES.map((state) => `'${state}'`).join(",")})`;
const ACCOUNT_STATE_LABELS: Record<AccountState, string> = {
  ACTIVE: "Active",
  AWAITING_SETUP: "Awaiting setup",
  SETUP_EXPIRED: "Setup link expired",
  DISABLED: "Disabled",
};
const ACCOUNT_STATE_TONES: Record<AccountState, AccountStateTone> = {
  ACTIVE: "green",
  AWAITING_SETUP: "neutral",
  SETUP_EXPIRED: "amber",
  DISABLED: "neutral",
};
export function accountStateLabel(state: AccountState): string {
  return ACCOUNT_STATE_LABELS[state];
}
export function accountStateTone(state: AccountState): AccountStateTone {
  return ACCOUNT_STATE_TONES[state];
}
export function needsSetup(state: AccountState): boolean {
  return SETUP_PENDING_STATES.includes(state);
}
