"use client";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Users,
  KeyRound,
  ChartNoAxesCombined,
} from "lucide-react";
import { Button, Field, PasswordInput } from "./ui";
import ThemeToggle from "./theme-toggle";
const LANDING_FEATURES = [
  {
    title: "Events",
    description: "Find SEC events and check in with your society.",
    icon: CalendarDays,
  },
  {
    title: "Society funding",
    description: "Apply for funding and keep your applications in one place.",
    icon: FileText,
  },
  {
    title: "Collaboration",
    description: "Bring societies together through High Impact events.",
    icon: Users,
  },
  {
    title: "Your points",
    description: "See attendance, earned points, and your PRT progress.",
    icon: ChartNoAxesCombined,
  },
];

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
    <main className={"auth-page" + (activate || checkin ? " auth-flow" : "")}>
      <section className="auth-story reference-hero">
        <header className="landing-nav">
          <a className="brand" href="/">
            <img
              src="/sec-logo.png"
              alt="Student Engineers’ Council"
              width={40}
              height={40}
              className="brand-logo"
            />
            <span>SocietyHub</span>
          </a>
          <nav aria-label="Landing navigation">
            <a href="#society-features">Explore</a>
            <a href="#society-sign-in">Sign in</a>
            <a href="mailto:society@sec.tamu.edu">Contact SEC</a>
          </nav>
          <ThemeToggle />
        </header>
        <div className="auth-hero-copy">
          <p className="reference-context">society hub</p>
          <h1>
            Student
            <br />
            Engineers’
            <br />
            Council
          </h1>
          <p>
            Track your society’s points, check in to events, and apply for
            funding. All in one place.
          </p>
          <div className="landing-actions">
            <a className="button" href="#society-sign-in">
              Sign in <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="button secondary" href="#society-features">
              Explore SocietyHub
            </a>
          </div>
        </div>
      </section>
      <section
        className="landing-features"
        id="society-features"
        aria-labelledby="feature-title"
      >
        <div className="reference-section-head">
          <h2 id="feature-title">Your society, connected.</h2>
          <span>04 features</span>
        </div>
        <div className="landing-tiles">
          {LANDING_FEATURES.map((feature) => (
            <a
              href="#society-sign-in"
              className="landing-tile"
              key={feature.title}
            >
              <div>
                <feature.icon size={22} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span>
                  Sign in to explore <ArrowRight size={15} aria-hidden="true" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section id="society-sign-in" className="auth-main">
        <div className="signin-introduction">
          <h2>Welcome back.</h2>
          <p>
            The shared home for Texas A&M’s engineering societies and the
            Student Engineers’ Council.
          </p>
        </div>
        <div className="auth-form">
          <h2>
            {activate
              ? "Set your account password"
              : checkin
                ? "Sign in to check in"
                : "Welcome to SocietyHub"}
          </h2>
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
      <footer className="landing-footer">
        <p>Powered by SEC Systems Administration</p>
        <p className="auth-description">
          © {new Date().getFullYear()} Student Engineers’ Council. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}
