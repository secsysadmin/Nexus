export function releaseState(
  runs: {
    head_sha: string;
    head_branch: string;
    event: string;
    status: string;
    conclusion: string | null;
  }[],
  sha: string,
) {
  if (!/^[a-f\d]{40}$/.test(sha))
    throw Error("A full Git commit SHA is required.");
  const run = runs.find(
    (r) => r.head_sha === sha && r.head_branch === "main" && r.event === "push",
  );
  if (!run || run.status !== "completed") return "pending";
  if (run.conclusion !== "success")
    throw Error("Required CI did not pass; production deployment is blocked.");
  return "passed";
}
