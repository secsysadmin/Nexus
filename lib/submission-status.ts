export const submissionStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "DENIED",
] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];
export const reviewStatuses = [
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "DENIED",
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  DENIED: "Denied",
};
const REVIEW_TRANSITIONS: Record<SubmissionStatus, readonly ReviewStatus[]> = {
  DRAFT: [],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "DENIED"],
  UNDER_REVIEW: ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "DENIED"],
  CHANGES_REQUESTED: ["CHANGES_REQUESTED", "APPROVED", "DENIED"],
  APPROVED: ["APPROVED", "UNDER_REVIEW"],
  DENIED: ["DENIED", "UNDER_REVIEW"],
};
export function statusLabel(status: SubmissionStatus): string {
  return STATUS_LABELS[status];
}
export function reviewOptions(from: SubmissionStatus): readonly ReviewStatus[] {
  return REVIEW_TRANSITIONS[from];
}
export function canReview(from: SubmissionStatus, to: ReviewStatus): boolean {
  return REVIEW_TRANSITIONS[from].includes(to);
}
