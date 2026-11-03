import test from "node:test";
import assert from "node:assert/strict";
import { releaseState } from "../lib/release-gate";
import { metricRoute } from "../lib/observability";
import { decisionContent } from "../lib/application-email";
test("release gate requires passing push CI for the exact main commit and fails closed", () => {
  const sha = "a".repeat(40),
    run = {
      head_sha: sha,
      head_branch: "main",
      event: "push",
      status: "completed",
      conclusion: "success",
    };
  assert.equal(releaseState([run], sha), "passed");
  for (const patch of [
    { head_sha: "b".repeat(40) },
    { head_branch: "feature" },
    { event: "pull_request" },
    { status: "in_progress" },
  ])
    assert.equal(releaseState([{ ...run, ...patch }], sha), "pending");
  for (const conclusion of ["failure", "cancelled", "skipped", null])
    assert.throws(() => releaseState([{ ...run, conclusion }], sha));
  assert.throws(() => releaseState([], ""));
});
test("observability labels discard query strings, identifiers and unknown paths", () => {
  assert.equal(
    metricRoute("/api/checkin?token=secret&email=private@example.invalid"),
    "checkin",
  );
  assert.equal(
    metricRoute("/api/forms/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?token=secret"),
    "forms/:id",
  );
  assert.equal(metricRoute("/api/user/private@example.invalid"), "other");
});
test("decision messages escape user content and keep feedback out of email", () => {
  for (const status of ["APPROVED", "DENIED", "CHANGES_REQUESTED"]) {
    const mail = decisionContent({
      societyName: "<script>bad()</script>",
      formTitle: "Test\r\nInjected",
      submissionId: "ref",
      status,
    });
    assert(!mail.html.includes("<script>"));
    assert(!mail.subject.includes("\n"));
    assert(!mail.html.includes("Application received."));
    assert(!mail.html.includes("This confirms receipt"));
    assert.match(mail.body, /Sign in/);
    assert(mail.body.includes("\n\n"));
    assert(!mail.subject.includes("\r"));
    assert(mail.subject.includes("Injected"));
  }
});
