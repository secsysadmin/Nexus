"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "./theme-script";
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.dataset.theme === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div className="theme-control">
      <button
        type="button"
        className="theme-toggle"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => {
          const next = dark ? "light" : "dark";
          document.documentElement.dataset.theme = next;
          try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
            setStorageNotice("");
          } catch {
            setStorageNotice(
              "Theme changed for this visit. Your browser could not save it.",
            );
          }
          setDark(!dark);
        }}
      >
        {dark ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
        <span>{dark ? "Light mode" : "Dark mode"}</span>
      </button>
      {storageNotice && (
        <small className="theme-storage-note" role="status">
          {storageNotice}
        </small>
      )}
    </div>
  );
}
