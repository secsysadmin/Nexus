"use client";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Users,
  KeyRound,
} from "lucide-react";
import { Button, Field, PasswordInput } from "./ui";
import ThemeToggle from "./theme-toggle";
type AuthScreenProps = {
  activate?: boolean;
  token?: string;
  checkin?: boolean;
  error: string;
  busy: boolean;
  onSubmit: (b: unknown) => Promise<void>;
};
export default function AuthScreen({
  activate = false,
  token = "",
  checkin = false,
  error,
  busy,
  onSubmit,
}: AuthScreenProps) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [localError, setLocalError] = useState("");
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <img
            src="/sec-logo.png"
            alt="Student Engineers’ Council"
            width={48}
            height={48}
            className="brand-logo"
          />
          <span>SocietyHub</span>
        </a>
        <div className="auth-hero-copy">
          <h2>
            Engineering is
            <br />
            better together.
          </h2>
          <p>
            Your society. Your people.
            <br />
            One place to bring it all together.
          </p>
          <div className="auth-capabilities" aria-label="SocietyHub features">
            <span>
              <CalendarDays size={17} aria-hidden="true" /> Events & check-in
            </span>
            <span>
              <FileText size={17} aria-hidden="true" /> Society funding
            </span>
            <span>
              <Users size={17} aria-hidden="true" /> Collaboration
            </span>
          </div>
          <a className="auth-mobile-signin" href="#society-sign-in">
            Sign in <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <p className="auth-description">
          Texas A&M University · Student Engineers’ Council
        </p>
      </section>
      <section id="society-sign-in" className="auth-main">
        <div className="auth-tools">
          <ThemeToggle />
        </div>
        <div className="auth-form">
          <h1>
            {activate
              ? "Set your account password"
              : checkin
                ? "Sign in to check in"
                : "Welcome to SocietyHub"}
          </h1>
          <p>
            {activate
              ? "Your society can share this password with its authorized officers."
              : "Sign in with your society username and shared password."}
          </p>
          {(error || localError) && (
            <div className="alert error" role="alert">
              {localError || error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLocalError("");
              if (activate && password !== confirm) {
                setLocalError("Passwords do not match.");
                return;
              }
              void onSubmit(
                activate ? { token, password } : { username, password },
              );
            }}
          >
            {!activate && (
              <Field label="Society username">
                <input
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your society username"
                  maxLength={40}
                />
              </Field>
            )}
            <Field
              label={activate ? "New password" : "Password"}
              hint={activate ? "Use at least 15 characters." : undefined}
            >
              <PasswordInput
                required
                autoComplete={activate ? "new-password" : "current-password"}
                minLength={activate ? 15 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {activate && (
              <Field label="Confirm password">
                <PasswordInput
                  required
                  autoComplete="new-password"
                  minLength={15}
                  maxLength={128}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
            )}
            <Button type="submit" disabled={busy || (activate && !token)}>
              {busy
                ? "Please wait…"
                : activate
                  ? "Set password & continue"
                  : "Sign in"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="auth-help">
            <span className="auth-help-icon" aria-hidden="true">
              <KeyRound size={17} />
            </span>
            <div>
              <strong>
                {activate
                  ? "Link not working?"
                  : "New society or forgot your password?"}
              </strong>
              <p>Request a one-time setup or password reset link.</p>
              <a
                className="auth-help-action"
                href="mailto:society@sec.tamu.edu?subject=SocietyHub%20account%20help"
              >
                Contact an SEC chair <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
