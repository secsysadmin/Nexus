import type { Instrumentation } from "next";
// Framework-level errors go to Vercel's server logs without request or error payloads.
// API failures and browser error categories are also counted in operational_metrics.
export const onRequestError: Instrumentation.onRequestError = async () => {
  console.error(
    JSON.stringify({ event: "framework_request_error", route: "framework" }),
  );
};
