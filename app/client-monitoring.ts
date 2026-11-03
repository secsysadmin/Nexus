let sent = 0;
export function reportClientError(
  kind: "uncaught" | "unhandled_rejection" | "react_boundary",
) {
  if (sent >= 3 || process.env.NODE_ENV !== "production") return;
  sent++;
  void fetch("/api/telemetry", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
    keepalive: true,
  }).catch(() => {});
}
