import { releaseState } from "../lib/release-gate";
import { spawn } from "node:child_process";
if (process.env.VERCEL_ENV === "production") {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha || !/^[a-f\d]{40}$/.test(sha))
    throw Error("Production requires a Git commit SHA and passing CI.");
  let passed = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(
      `https://api.github.com/repos/secsysadmin/Nexus/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...(process.env.GITHUB_CHECKS_TOKEN
            ? { Authorization: "Bearer " + process.env.GITHUB_CHECKS_TOKEN }
            : {}),
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw Error(
        "Cannot verify required CI; production deployment is blocked.",
      );
    const result = await response.json();
    if (releaseState(result.workflow_runs ?? [], sha) === "passed") {
      passed = true;
      break;
    }
    console.log("Waiting for required CI on this exact production commit…");
    await new Promise((r) => setTimeout(r, 20000));
  }
  if (!passed)
    throw Error(
      "Required CI was not completed within 10 minutes; retry deployment after CI succeeds.",
    );
  console.log("Required CI passed for the production commit.");
}
const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  { stdio: "inherit", env: process.env },
);
process.exitCode = await new Promise<number>((r) =>
  next.on("exit", (code) => r(code ?? 1)).on("error", () => r(1)),
);
