"use client";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Users,
  ChartNoAxesCombined,
} from "lucide-react";
import SocietySignIn from "./society-sign-in";
import ThemeToggle from "./theme-toggle";
const LANDING_FEATURES = [
  {
    title: "Show up. Check in.",
    description:
      "Find SEC events and record your society’s attendance with a QR code or sign-in link.",
    icon: CalendarDays,
  },
  {
    title: "Make your plans happen.",
    description:
      "Apply for society funding and follow every submission, decision, and update.",
    icon: FileText,
  },
  {
    title: "Build something together.",
    description:
      "Connect societies through cross-collaboration and High Impact events.",
    icon: Users,
  },
  {
    title: "See where you stand.",
    description:
      "Keep a clear record of your earned points and Presidents’ Round Table progress.",
    icon: ChartNoAxesCombined,
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
            src="/sec-logo.png"
            alt="Student Engineers’ Council"
            width={40}
            height={40}
            className="brand-logo"
          />
          <span>
            SocietyHub<small>Texas A&M Engineering</small>
          </span>
        </a>
        <nav aria-label="Landing navigation">
          {!focused && (
            <a href="#society-features">
              Explore the hub <ArrowDownRight size={15} aria-hidden="true" />
            </a>
          )}
          <a href="mailto:society@sec.tamu.edu">
            Contact SEC <ArrowUpRight size={15} aria-hidden="true" />
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
            <p>
              The place for Texas A&M’s engineering societies to connect with
              the Student Engineers’ Council.
            </p>
          </div>
          <div className="landing-art" aria-hidden="true">
            <img src="/society-ribbon.svg" alt="" width={890} height={1070} />
          </div>
          <div className="landing-story-footer">
            <span>One society. More possibilities.</span>
            <ArrowDownRight size={22} aria-hidden="true" />
          </div>
        </section>
        <section
          id="society-sign-in"
          className="auth-main"
          aria-label="Society sign-in"
        >
          <SocietySignIn {...props} />
        </section>
      </div>
      {!focused && (
        <section
          className="landing-features"
          id="society-features"
          aria-labelledby="feature-title"
        >
          <div className="reference-section-head">
            <h2 id="feature-title">
              Everything your society needs.
              <br />
              <span>Room for what’s next.</span>
            </h2>
            <p>
              Less keeping track.
              <br />
              More moving forward.
            </p>
          </div>
          <div className="landing-tiles">
            {LANDING_FEATURES.map((feature) => (
              <article className="landing-tile" key={feature.title}>
                <span className="landing-feature-icon">
                  <feature.icon size={23} aria-hidden="true" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
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
