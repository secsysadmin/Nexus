"use client";
import { useEffect, useState } from "react";
export function confirmDiscard() {
  return (
    !document.querySelector('[data-unsaved-changes="true"]') ||
    window.confirm("You have unsaved changes. Leave without saving?")
  );
}
export function useUnsavedChanges(value: string, enabled = true) {
  const [baseline, setBaseline] = useState(value);
  const dirty = enabled && value !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return { dirty, markSaved: () => setBaseline(value) };
}
