export const accountStates = [
  "ACTIVE",
  "AWAITING_SETUP",
  "SETUP_EXPIRED",
  "DISABLED",
] as const;
export type AccountState = (typeof accountStates)[number];
export const ACCOUNT_STATE_SQL =
  "CASE WHEN NOT a.enabled THEN 'DISABLED' WHEN a.password_hash IS NOT NULL THEN 'ACTIVE' WHEN EXISTS(SELECT 1 FROM activation_tokens t WHERE t.account_id=a.id AND t.expires_at>now()) THEN 'AWAITING_SETUP' ELSE 'SETUP_EXPIRED' END account_state";
const ACCOUNT_STATE_LABELS: Record<AccountState, string> = {
  ACTIVE: "Active",
  AWAITING_SETUP: "Awaiting setup",
  SETUP_EXPIRED: "Setup link expired",
  DISABLED: "Disabled",
};
const ACCOUNT_STATE_TONES: Record<AccountState, string> = {
  ACTIVE: "green",
  AWAITING_SETUP: "neutral",
  SETUP_EXPIRED: "amber",
  DISABLED: "neutral",
};
export function accountStateLabel(state: AccountState): string {
  return ACCOUNT_STATE_LABELS[state];
}
export function accountStateTone(state: AccountState): string {
  return ACCOUNT_STATE_TONES[state];
}
export function needsSetup(state: AccountState): boolean {
  return state === "AWAITING_SETUP" || state === "SETUP_EXPIRED";
}
