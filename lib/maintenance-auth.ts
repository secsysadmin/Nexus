import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { secretMatches } from "./security";
const keys = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
  { timeoutDuration: 5000, cooldownDuration: 30000 },
);
export function authorizedWorkflowClaims(p: JWTPayload) {
  return (
    p.repository_id === "1443310145" &&
    p.repository === "secsysadmin/Nexus" &&
    p.ref === "refs/heads/main" &&
    p.workflow_ref ===
      "secsysadmin/Nexus/.github/workflows/maintenance.yml@refs/heads/main" &&
    ["schedule", "workflow_dispatch"].includes(String(p.event_name))
  );
}
export async function maintenanceAuthorized(header: string | null) {
  if (!header?.startsWith("Bearer ")) return false;
  const raw = header.slice(7);
  if (secretMatches(raw, process.env.CRON_SECRET)) return true;
  if (process.env.VERCEL_ENV !== "production") return false;
  try {
    const origin = new URL(process.env.SOCIETYHUB_APP_URL ?? "").origin;
    const { payload } = await jwtVerify(raw, keys, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: origin,
      algorithms: ["RS256"],
      maxTokenAge: "10m",
    });
    return authorizedWorkflowClaims(payload);
  } catch {
    return false;
  }
}
