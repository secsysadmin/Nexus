"use client";
import { ArrowUpRight, CalendarDays, FileText, Users } from "lucide-react";
import SocietySignIn from "./society-sign-in";
import ThemeToggle from "./theme-toggle";
const LANDING_CAPABILITIES = [
  {
    title: "Events & check-in",
    description: "Find your next event. Make your attendance count.",
    icon: CalendarDays,
  },
  {
    title: "Funding & applications",
    description: "Keep your plans, submissions, and decisions together.",
    icon: FileText,
  },
  {
    title: "Cross-society collaboration",
    description: "Turn shared ideas into something bigger.",
    icon: Users,
  },
];
type AuthScreenProps = {
  activate?: boolean;
  token?: string;
  checkin?: boolean;
  error: string;
  busy: boolean;
  onSubmit: (body: unknown) => Promise<void>;
};
export default function AuthScreen(props: AuthScreenProps) {
  const focused = props.activate || props.checkin;
  return (
    <main className={"auth-page" + (focused ? " auth-flow" : "")}>
      <header className="landing-nav">
        <a className="brand" href="/">
          <img
            src="/societyhub-mark.svg"
            alt=""
            width={40}
            height={40}
            className="brand-logo"
          />
          <span>
            SocietyHub<small>A place to move forward.</small>
          </span>
        </a>
        <nav aria-label="Landing navigation">
          <a href="mailto:society@sec.tamu.edu">
            Get in touch <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </nav>
        <ThemeToggle />
      </header>
      <div className="landing-stage">
        <section className="auth-story">
          <div className="auth-hero-copy">
            <h1>
              Your society.
              <br />
              <span>A shared home.</span>
            </h1>
            <p>A little less keeping track. A lot more coming together.</p>
          </div>
          <ul
            className="landing-capabilities"
            id="society-features"
            aria-label="What you can do in SocietyHub"
          >
            {LANDING_CAPABILITIES.map((capability) => (
              <li key={capability.title}>
                <span className="capability-icon">
                  <capability.icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <strong>{capability.title}</strong>
                  <p>{capability.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="landing-context">
            For Texas A&M engineering societies and the Student Engineers’
            Council.
          </p>
        </section>
        <section
          id="society-sign-in"
          className="auth-main"
          aria-label="Society sign-in"
        >
          <SocietySignIn {...props} />
        </section>
      </div>
      <footer className="landing-footer">
        <p>SocietyHub</p>
        <p className="auth-description">Built for engineering societies.</p>
      </footer>
    </main>
  );
}
