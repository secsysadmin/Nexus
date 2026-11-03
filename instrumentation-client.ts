import { reportClientError } from "./app/client-monitoring";
// Categories only: no messages, URLs, stacks, answers, or contact details.
window.addEventListener("error", () => reportClientError("uncaught"));
window.addEventListener("unhandledrejection", () =>
  reportClientError("unhandled_rejection"),
);
