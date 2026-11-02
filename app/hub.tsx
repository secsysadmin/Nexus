"use client";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  History,
  Users,
  Settings,
  LogOut,
  ArrowUpRight,
  ArrowRight,
  Check,
  Plus,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  ClipboardCheck,
  RefreshCw,
  Menu,
  X,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import QRCode from "qrcode";
import MaroonRibbons from "./maroon-ribbons";
import SemesterPoints from "./semester-points";
import { dashboardItems } from "../lib/dashboard";
import { defaultConfirmationEmail } from "../lib/application-email";
import type {
  HubData,
  Event,
  Form,
  Submission,
  Candidate,
  Account,
} from "../lib/types";
import { labels, type Question, type Answers } from "../lib/domain";
const when = (s: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(s));
const status = (s: string) => s.toLowerCase().replaceAll("_", " ");
const localDate = (s: string) => {
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error ?? "Request failed.") as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return data;
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function DashboardSection({
  title,
  count,
  emptyText,
  action,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={count ? "dashboard-section" : "dashboard-clear"}
      aria-label={title}
      data-count={count}
    >
      {count ? (
        <>
          <div className="section-head">
            <div className="dashboard-section-title">
              <h2>{title}</h2>
              <span className="dashboard-count" aria-label={`${count} items`}>
                {count}
              </span>
            </div>
            {action}
          </div>
          {children}
        </>
      ) : (
        <>
          <p>
            <Check size={16} aria-hidden="true" />
            {emptyText}
          </p>
          {action}
        </>
      )}
    </section>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  "aria-label"?: string;
}) {
  return (
    <button
      type={type}
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
function FormActions({
  busy,
  onCancel,
  label = "Save changes",
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="actions">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
      <Button secondary onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
function ContactInfo({ contacts }: { contacts: Record<string, unknown> }) {
  return <pre className="contacts">{JSON.stringify(contacts, null, 2)}</pre>;
}
export default function Hub() {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<HubData | null>(null),
    [loading, setLoading] = useState(true),
    [authNeeded, setAuthNeeded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("overview"),
    [semester, setSemester] = useState(""),
    [mobile, setMobile] = useState(false);
  const [route, setRoute] = useState<{
    mode: string;
    token: string;
    eventId: string;
  }>({ mode: "home", token: "", eventId: "" });
  const [editingEvent, setEditingEvent] = useState<Event | null | undefined>(),
    [editingForm, setEditingForm] = useState<Form | null | undefined>(),
    [application, setApplication] = useState<Form | null>(null),
    [review, setReview] = useState<Submission | null>(null),
    [qrEvent, setQrEvent] = useState<Event | null>(null),
    [provision, setProvision] = useState(false),
    [selectedRoster, setSelectedRoster] = useState<string[]>([]),
    [activation, setActivation] = useState<{
      username: string;
      activation: string;
    } | null>(null),
    [checkResult, setCheckResult] = useState<{
      already: boolean;
      event: string;
      points: number;
    } | null>(null);
  const refresh = useCallback(async () => {
    try {
      const d = await api<HubData>("data");
      setData(d);
      setAuthNeeded(false);
      setSemester(
        (s) =>
          s ||
          d.semesters.find((s) => s.is_current)?.id ||
          d.semesters[0]?.id ||
          "",
      );
    } catch (e) {
      if ((e as Error & { status?: number }).status === 401) {
        setData(null);
        setAuthNeeded(true);
      } else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobile) {
        setMobile(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [mobile]);
  useEffect(() => {
    if (mobile)
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-close")
        ?.focus();
  }, [mobile]);
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    setRoute({
      mode:
        path === "/activate"
          ? "activate"
          : path.startsWith("/checkin/")
            ? "checkin"
            : "home",
      token: params.get("token") ?? "",
      eventId: path.split("/")[2] ?? "",
    });
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !busy &&
        !editingEvent &&
        !editingForm &&
        !application &&
        !review
      )
        void refresh();
    }, 30000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [
    data?.actor.id,
    busy,
    editingEvent,
    editingForm,
    application,
    review,
    refresh,
  ]);
  const run = async <T,>(
    path: string,
    body: unknown,
    message?: string,
  ): Promise<T | undefined> => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<T>(path, body);
      if (message) setNotice(message);
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const navigate = (next: string) => {
    setTab(next);
    if (mobile) menuButtonRef.current?.focus();
    setMobile(false);
    setEditingEvent(undefined);
    setEditingForm(undefined);
    setApplication(null);
    setReview(null);
    setQrEvent(null);
    setProvision(false);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (loading)
    return (
      <main className="standalone" aria-busy="true">
        <img
          src="/sec-logo.png"
          alt="Student Engineers’ Council"
          width={48}
          height={48}
          className="brand-logo"
        />
        <h1>SocietyHub</h1>
        <p>Opening your workspace…</p>
      </main>
    );
  if (route.mode === "activate")
    return (
      <AuthScreen
        activate
        token={route.token}
        error={error}
        busy={busy}
        onSubmit={async (b) => {
          const r = await run("auth/activate", b);
          if (r) {
            window.history.replaceState({}, "", "/");
            setRoute({ mode: "home", token: "", eventId: "" });
          }
        }}
      />
    );
  if (!data) {
    if (!authNeeded && error)
      return (
        <main className="standalone">
          <h1>Unable to connect</h1>
          <p role="alert">{error}</p>
          <Button
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            Try again
          </Button>
        </main>
      );
    return (
      <AuthScreen
        error={error}
        busy={busy}
        checkin={route.mode === "checkin"}
        onSubmit={async (b) => {
          await run("auth/login", b);
        }}
      />
    );
  }
  const admin = data.actor.role === "admin";
  const current = data.semesters.find((s) => s.id === semester);
  const events = data.events.filter((e) => e.semester_id === semester);
  const credits = data.credits.filter((c) => c.semester_id === semester);
  const activeCredits = credits.filter((c) => !c.revoked_at);
  const forms = data.forms.filter((f) => f.semester_id === semester);
  const societies = data.accounts.filter((a) => a.role === "society");
  const totals = (id?: string) =>
    ["PRT", "STANDARD", "HIGH_IMPACT"].map((category) =>
      activeCredits
        .filter((c) => c.category === category && (!id || c.account_id === id))
        .reduce((s, c) => s + c.points, 0),
    );
  const dashboard = dashboardItems(data, semester, Date.now());
  const title: Record<string, string> = {
    overview: admin ? "SEC dashboard" : `Hello ${data.actor.display_name}`,
    events: "Events & check-in",
    applications: "Applications",
    activity: "Attendance & points",
    societies: "Societies",
    reviews: "Application review",
    settings: "Workspace settings",
  };
  const nav = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "events", label: "Events", icon: CalendarDays },
    { id: "applications", label: "Applications", icon: FileText },
    { id: "activity", label: "Attendance & points", icon: History },
    ...(admin
      ? [
          { id: "societies", label: "Societies", icon: Users },
          { id: "reviews", label: "Review queue", icon: ClipboardCheck },
        ]
      : []),
    {
      id: "settings",
      label: admin ? "Settings & audit" : "Account settings",
      icon: Settings,
    },
  ];
  return (
    <div className="hub">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        id="workspace-navigation"
        ref={sidebarRef}
        className={"sidebar " + (mobile ? "open" : "")}
      >
        <a href="/" className="brand">
          <img
            src="/sec-logo.png"
            alt="Student Engineers’ Council"
            width={42}
            height={42}
            className="brand-logo"
          />
          <span>SocietyHub</span>
        </a>
        <button
          className="icon-button sidebar-close"
          aria-label="Close sidebar"
          onClick={() => {
            setMobile(false);
            menuButtonRef.current?.focus();
          }}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          {admin ? "SEC workspace" : "Society workspace"}
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav active" : "nav"}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "reviews" &&
                data.submissions.filter((s) => s.status === "SUBMITTED")
                  .length > 0 && (
                  <span className="nav-count">
                    {
                      data.submissions.filter((s) => s.status === "SUBMITTED")
                        .length
                    }
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="identity">
            <div className="avatar">
              {admin ? "SEC" : data.actor.username.slice(0, 2).toUpperCase()}
            </div>
            <span>
              <strong>{data.actor.display_name}</strong>
              <small>@{data.actor.username}</small>
            </span>
          </div>
          <button
            className="nav"
            disabled={busy}
            onClick={() => void run("auth/logout", {})}
          >
            <LogOut size={18} />
            Sign out
          </button>
          <p>
            Texas A&M University
            <br />
            Student Engineers’ Council
          </p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            aria-expanded={mobile}
            aria-controls="workspace-navigation"
            className="icon-button mobile-menu"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <span>
            Engineering societies{" "}
            <span className="breadcrumb">
              / {admin ? "SEC administration" : "Member workspace"}
            </span>
          </span>
          <div className="topbar-actions">
            <label className="semester-select">
              <CalendarDays size={16} />
              <span className="sr-only">Viewing semester</span>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                {data.semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.is_current ? " · Current" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              className="icon-button"
              onClick={() => void refresh()}
              aria-label="Refresh workspace"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        <main
          id="main-content"
          className={tab === "overview" ? "content is-dashboard" : "content"}
        >
          <div className="page-heading">
            <div>
              <h1>{title[tab]}</h1>
              <p>
                {admin
                  ? "Manage your societies, events, and funding cycle."
                  : tab === "overview"
                    ? "Your home for SEC events and society funding."
                    : `${data.actor.display_name} · Your home for SEC events and society funding.`}
              </p>
            </div>
            {tab === "overview" && admin && (
              <Button
                onClick={() => {
                  if (dashboard.pendingReviews.length) {
                    navigate("reviews");
                    setReview(dashboard.pendingReviews[0]);
                  } else {
                    navigate("events");
                    setEditingEvent(dashboard.upcomingEvents[0] ?? null);
                  }
                }}
              >
                {dashboard.pendingReviews.length
                  ? "Review next application"
                  : dashboard.upcomingEvents.length
                    ? "Manage next event"
                    : "Create event"}
                <ArrowRight size={17} />
              </Button>
            )}
            {tab === "events" && admin && editingEvent === undefined && (
              <Button onClick={() => setEditingEvent(null)}>
                <Plus size={17} />
                Create event
              </Button>
            )}
            {tab === "applications" && admin && editingForm === undefined && (
              <Button onClick={() => setEditingForm(null)}>
                <Plus size={17} />
                Create application
              </Button>
            )}
          </div>
          {data.environment === "development" && (
            <div className="environment-note">
              Development workspace · Separate from production
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={18} />
              {notice}
            </div>
          )}
          {activation && (
            <section className="activation-result">
              <h2>Account setup link for @{activation.username}</h2>
              <p>
                Share this one-time link privately with the society. It expires
                in seven days. A reset invalidates existing sessions once the
                new password is set.
              </p>
              <CopyLink
                value={`${window.location.origin}/activate?token=${activation.activation}`}
              />
              <Button secondary onClick={() => setActivation(null)}>
                Dismiss link
              </Button>
            </section>
          )}
          {route.mode === "checkin" && (
            <Panel title="Event check-in">
              {checkResult ? (
                <div className="checkin-result">
                  <ShieldCheck size={36} />
                  <h3>
                    {checkResult.already
                      ? "You’re already checked in."
                      : "You’re checked in."}
                  </h3>
                  <p>
                    {checkResult.event} ·{" "}
                    {checkResult.already
                      ? "No additional points awarded."
                      : `+${checkResult.points} point added to your society.`}
                  </p>
                  <Button
                    onClick={() => {
                      setRoute({ mode: "home", token: "", eventId: "" });
                      window.history.replaceState({}, "", "/");
                    }}
                  >
                    View dashboard
                  </Button>
                </div>
              ) : (
                <>
                  <p>
                    Record attendance as{" "}
                    <strong>{data.actor.display_name}</strong>. Your society
                    receives credit once per event.
                  </p>
                  <Button
                    disabled={busy || admin}
                    onClick={async () => {
                      const r = await run<{
                        already: boolean;
                        event: string;
                        points: number;
                      }>("checkin", {
                        eventId: route.eventId,
                        token: route.token,
                      });
                      if (r) setCheckResult(r);
                    }}
                  >
                    {busy ? "Checking in…" : "Confirm check-in"}
                  </Button>
                  {admin && (
                    <p>Sign out and use a society account to check in.</p>
                  )}
                </>
              )}
            </Panel>
          )}
          {tab === "overview" && (
            <>
              <div className="dashboard-context">
                <p>
                  {current?.name ?? "Choose a semester"} ·{" "}
                  {admin
                    ? `${societies.filter((s) => s.enabled).length} active societies`
                    : "Points update automatically after check-in."}
                </p>
                <span>
                  {current?.is_current
                    ? "Current semester"
                    : "Semester history"}
                </span>
              </div>
              {!admin ? (
                <>
                  {current && (
                    <SemesterPoints
                      key={current.id}
                      credits={credits}
                      semester={current}
                      accountId={data.actor.id}
                      onHistory={() => navigate("activity")}
                    />
                  )}
                  <DashboardSection
                    title="Upcoming & ongoing events"
                    count={dashboard.upcomingEvents.length}
                    emptyText="No upcoming events in this semester"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("events")}
                      >
                        View events <ArrowUpRight size={16} />
                      </button>
                    }
                  >
                    {dashboard.upcomingEvents.length ? (
                      dashboard.upcomingEvents.slice(0, 3).map((event) => (
                        <div className="record" key={event.id}>
                          <div>
                            <strong>{event.name}</strong>
                            <small>
                              {when(event.starts_at)} CT
                              {event.location && ` · ${event.location}`}
                            </small>
                          </div>
                          <Pill tone="neutral">
                            {event.category === "PRT"
                              ? "PRT"
                              : labels[event.category]}
                          </Pill>
                        </div>
                      ))
                    ) : (
                      <Empty title="No upcoming events">
                        SEC events will appear here when they are scheduled for
                        this semester.
                      </Empty>
                    )}
                  </DashboardSection>
                  <div className="dashboard-grid">
                    <DashboardSection
                      title="Recent attendance"
                      count={credits.length}
                      emptyText="No attendance recorded yet"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("activity")}
                        >
                          View history <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      {credits.length ? (
                        <div className="record-list">
                          {credits.slice(0, 5).map((c) => (
                            <div className="record" key={c.id}>
                              <div>
                                <strong>{c.event_name}</strong>
                                <small>
                                  {labels[c.category]} · {when(c.created_at)}
                                </small>
                              </div>
                              <Pill tone={c.revoked_at ? "neutral" : "green"}>
                                {c.revoked_at
                                  ? "Removed"
                                  : `+${c.points} ${c.points === 1 ? "point" : "points"}`}
                              </Pill>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty title="Your attendance starts here">
                          Scan an event’s QR code or open its sign-in link to
                          earn your first point.
                        </Empty>
                      )}
                    </DashboardSection>
                    <DashboardSection
                      title="Applications"
                      count={forms.length}
                      emptyText="No applications published for this semester"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("applications")}
                        >
                          View all <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      {forms.length ? (
                        forms.slice(0, 3).map((f) => (
                          <button
                            className="application-link"
                            key={f.id}
                            onClick={() => {
                              navigate("applications");
                              setApplication(f);
                            }}
                          >
                            <span>
                              <strong>{f.title}</strong>
                              <small>
                                {status(
                                  data.submissions.find(
                                    (s) => s.form_id === f.id,
                                  )?.status ??
                                    (f.published ? "OPEN" : "CLOSED"),
                                )}
                              </small>
                            </span>
                            <ArrowRight size={18} />
                          </button>
                        ))
                      ) : (
                        <Empty title="No applications published">
                          SEC will publish funding and High Impact event
                          applications here.
                        </Empty>
                      )}
                    </DashboardSection>
                  </div>
                </>
              ) : (
                <>
                  <DashboardSection
                    title="Applications awaiting review"
                    count={dashboard.pendingReviews.length}
                    emptyText="Review queue clear"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("reviews")}
                      >
                        Open review queue <ArrowUpRight size={16} />
                      </button>
                    }
                  >
                    <p className="section-intro">
                      For {current?.name}. Oldest submissions appear first.
                    </p>
                    {dashboard.pendingReviews.length ? (
                      dashboard.pendingReviews.slice(0, 5).map((item) => (
                        <div className="record dashboard-record" key={item.id}>
                          <div>
                            <strong>{item.society_name}</strong>
                            <small>
                              {item.form_title} · Submitted{" "}
                              {when(item.submitted_at)} CT
                            </small>
                          </div>
                          <Button
                            secondary
                            onClick={() => {
                              navigate("reviews");
                              setReview(item);
                            }}
                            aria-label={`Review ${item.form_title} from ${item.society_name}`}
                          >
                            Review application
                          </Button>
                        </div>
                      ))
                    ) : (
                      <Empty title="The review queue is clear">
                        No submitted applications are waiting for review in this
                        semester.
                      </Empty>
                    )}
                    {dashboard.pendingReviews.length > 5 && (
                      <small>
                        Showing 5 of {dashboard.pendingReviews.length}. Open the
                        review queue for all submissions.
                      </small>
                    )}
                  </DashboardSection>
                  <div className="dashboard-grid">
                    <DashboardSection
                      title="Upcoming & ongoing events"
                      count={dashboard.upcomingEvents.length}
                      emptyText="No upcoming events in this semester"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("events")}
                        >
                          All events <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      {dashboard.upcomingEvents.length ? (
                        dashboard.upcomingEvents.slice(0, 5).map((event) => (
                          <div
                            className="record dashboard-record"
                            key={event.id}
                          >
                            <div>
                              <strong>{event.name}</strong>
                              <small>
                                {when(event.starts_at)} – {when(event.ends_at)}{" "}
                                CT
                              </small>
                              <small>
                                {event.category === "HIGH_IMPACT"
                                  ? "High Impact · SEC awards points manually"
                                  : !current?.is_current
                                    ? "Self check-in unavailable in an inactive semester"
                                    : event.checkin_open
                                      ? Date.parse(event.starts_at) > Date.now()
                                        ? "Check-in scheduled for the event window"
                                        : "Check-in is live"
                                      : "Check-in disabled"}
                              </small>
                            </div>
                            <button
                              className="text-button"
                              onClick={() => {
                                navigate("events");
                                setEditingEvent(event);
                              }}
                              aria-label={`Manage ${event.name}`}
                            >
                              Manage event <ArrowRight size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <Empty title="No upcoming events">
                          There are no ongoing or upcoming events in this
                          semester. Add or manage events from the Events tab.
                        </Empty>
                      )}
                      {dashboard.upcomingEvents.length > 5 && (
                        <small>
                          Showing the next 5 events. Open All events for the
                          full schedule.
                        </small>
                      )}
                    </DashboardSection>
                    <DashboardSection
                      title="PRT minimum not yet met"
                      count={dashboard.missingPrt.length}
                      emptyText="No societies need PRT follow-up"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("activity")}
                        >
                          Attendance & points <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      <p className="section-intro">
                        Enabled societies with less than 1 PRT point in{" "}
                        {current?.name}. Each society needs 1 PRT point per
                        semester.
                      </p>
                      {dashboard.missingPrt.length ? (
                        dashboard.missingPrt.slice(0, 5).map((account) => (
                          <div className="record" key={account.id}>
                            <div>
                              <strong>{account.display_name}</strong>
                              <small>@{account.username}</small>
                            </div>
                            <Pill tone="amber">0 / 1 PRT</Pill>
                          </div>
                        ))
                      ) : (
                        <Empty title="No PRT follow-up needed">
                          All enabled societies have met the minimum, or no
                          enabled societies have been added.
                        </Empty>
                      )}
                      {dashboard.missingPrt.length > 5 && (
                        <small>
                          Showing 5 of {dashboard.missingPrt.length}. Expand All
                          society point totals below for every society.
                        </small>
                      )}
                    </DashboardSection>
                  </div>
                  <DashboardSection
                    title="Accounts awaiting setup"
                    count={dashboard.awaitingSetup.length}
                    emptyText="No accounts awaiting setup"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("societies")}
                      >
                        Manage societies <ArrowUpRight size={16} />
                      </button>
                    }
                  >
                    <p className="section-intro">
                      Across all semesters. These enabled society accounts have
                      not set their password.
                    </p>
                    {dashboard.awaitingSetup.length ? (
                      dashboard.awaitingSetup.slice(0, 5).map((account) => (
                        <div
                          className="record dashboard-record"
                          key={account.id}
                        >
                          <div>
                            <strong>{account.display_name}</strong>
                            <small>@{account.username}</small>
                          </div>
                          <Button
                            secondary
                            disabled={busy}
                            onClick={async () => {
                              const result = await run<{
                                username: string;
                                activation: string;
                              }>("admin/activation", { accountId: account.id });
                              if (result) {
                                setActivation(result);
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                              }
                            }}
                            aria-label={`Issue setup link for ${account.display_name}`}
                          >
                            Issue setup link
                          </Button>
                        </div>
                      ))
                    ) : (
                      <Empty title="Account setup is complete">
                        No enabled society accounts are waiting to set their
                        password.
                      </Empty>
                    )}
                    {dashboard.awaitingSetup.length > 5 && (
                      <small>
                        Showing 5 of {dashboard.awaitingSetup.length}. Manage
                        societies to view all accounts.
                      </small>
                    )}
                  </DashboardSection>
                  <details className="dashboard-register">
                    <summary>All society point totals</summary>
                    <Panel
                      title="Society funding progress"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("societies")}
                        >
                          Manage societies <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      {societies.length ? (
                        <div
                          className="table-wrap"
                          tabIndex={0}
                          role="region"
                          aria-label="Scrollable data table"
                        >
                          <table>
                            <thead>
                              <tr>
                                <th>Society</th>
                                <th>PRT</th>
                                <th>Standard</th>
                                <th>High Impact</th>
                                <th>PRT minimum</th>
                              </tr>
                            </thead>
                            <tbody>
                              {societies.map((a) => {
                                const t = totals(a.id);
                                return (
                                  <tr key={a.id}>
                                    <td>
                                      <strong>{a.display_name}</strong>
                                      <small>@{a.username}</small>
                                    </td>
                                    {t.map((n, i) => (
                                      <td key={i}>{n}</td>
                                    ))}
                                    <td>
                                      <Pill
                                        tone={t[0] >= 1 ? "green" : "amber"}
                                      >
                                        {t[0] >= 1 ? "Met" : "Not yet met"}
                                      </Pill>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty title="Bring your societies together">
                          Open Societies to review the contact roster and issue
                          account setup links.
                        </Empty>
                      )}
                    </Panel>
                  </details>
                </>
              )}
              <section className="funding-note">
                <FileText size={22} />
                <div>
                  <h3>One society. One record.</h3>
                  <p>
                    PRT and Standard attendance earn one point per event. SEC
                    awards two points for each qualifying High Impact event. The
                    PRT minimum is one point per semester.
                  </p>
                </div>
              </section>
            </>
          )}
          {tab === "events" &&
            (editingEvent !== undefined ? (
              <EventEditor
                initial={editingEvent}
                semesters={data.semesters}
                selectedSemester={semester}
                busy={busy}
                cancel={() => setEditingEvent(undefined)}
                save={async (body) => {
                  if (await run("admin/events", body, "Event saved."))
                    setEditingEvent(undefined);
                }}
              />
            ) : (
              <>
                <Panel
                  title={admin ? "Semester events" : "Events this semester"}
                >
                  {events.length ? (
                    <div className="event-list">
                      {events.map((e) => (
                        <article className="event-row" key={e.id}>
                          <div className="date-block">
                            <span>
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                timeZone: "America/Chicago",
                              }).format(new Date(e.starts_at))}
                            </span>
                            <strong>
                              {new Intl.DateTimeFormat("en-US", {
                                day: "numeric",
                                timeZone: "America/Chicago",
                              }).format(new Date(e.starts_at))}
                            </strong>
                          </div>
                          <div className="event-details">
                            <div className="inline">
                              <h3>{e.name}</h3>
                              <Pill>
                                {e.category === "PRT"
                                  ? "PRT"
                                  : e.category === "STANDARD"
                                    ? "Standard"
                                    : "High Impact"}
                              </Pill>
                            </div>
                            <p>{e.description}</p>
                            <small>
                              {when(e.starts_at)} – {when(e.ends_at)} CT
                              {e.location && ` · ${e.location}`}
                            </small>
                            <small>
                              {e.category === "HIGH_IMPACT"
                                ? "2 points · SEC awards manually"
                                : `1 point · Check-in ${e.checkin_open ? "enabled" : "disabled"}`}
                            </small>
                          </div>
                          {admin && (
                            <div className="event-actions">
                              <Button
                                secondary
                                onClick={() => setEditingEvent(e)}
                              >
                                Edit
                              </Button>
                              {e.category !== "HIGH_IMPACT" && (
                                <>
                                  <Button
                                    secondary
                                    onClick={() => setQrEvent(e)}
                                  >
                                    QR & link
                                  </Button>
                                  <Button
                                    secondary
                                    disabled={busy}
                                    onClick={() =>
                                      void run(
                                        "admin/event-checkin",
                                        { id: e.id, open: !e.checkin_open },
                                        e.checkin_open
                                          ? "Check-in disabled."
                                          : "Check-in enabled within the event window.",
                                      )
                                    }
                                  >
                                    {e.checkin_open
                                      ? "Close check-in"
                                      : "Open check-in"}
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No events in this semester">
                      {admin
                        ? "Create a PRT, Standard, or High Impact event to get started."
                        : "SEC will add upcoming society events here."}
                    </Empty>
                  )}
                </Panel>
                {qrEvent && (
                  <QRPanel
                    event={
                      data.events.find((e) => e.id === qrEvent.id) ?? qrEvent
                    }
                    close={() => setQrEvent(null)}
                    rotate={async () => {
                      await run(
                        "admin/event-checkin",
                        {
                          id: qrEvent.id,
                          open: qrEvent.checkin_open,
                          rotate: true,
                        },
                        "A new check-in link was generated. Previous links no longer work.",
                      );
                    }}
                    busy={busy}
                  />
                )}
              </>
            ))}
          {tab === "activity" && (
            <>
              {admin && (
                <ManualAward
                  events={events.filter((e) => e.category === "HIGH_IMPACT")}
                  societies={societies.filter((a) => a.enabled)}
                  busy={busy}
                  save={async (b) =>
                    !!(await run(
                      "admin/credits",
                      b,
                      "Two High Impact points awarded.",
                    ))
                  }
                />
              )}
              <Panel
                title="Attendance ledger"
                action={
                  <Button secondary onClick={() => exportCredits(credits)}>
                    Export CSV
                  </Button>
                }
              >
                {credits.length ? (
                  <div className="ledger">
                    {credits.map((c) => (
                      <article className="ledger-row" key={c.id}>
                        <div>
                          <h3>{c.event_name}</h3>
                          <p>
                            {admin ? `${c.society_name} · ` : ""}
                            {labels[c.category]}
                          </p>
                          <small>
                            {when(c.created_at)} CT ·{" "}
                            {c.source === "MANUAL"
                              ? "Manual SEC award"
                              : "QR / link check-in"}
                            {c.note && ` · ${c.note}`}
                          </small>
                        </div>
                        <Pill tone={c.revoked_at ? "neutral" : "green"}>
                          {c.revoked_at ? "Removed" : `+${c.points}`}
                        </Pill>
                        {admin && (
                          <CreditCorrection
                            id={c.id}
                            revoked={!!c.revoked_at}
                            busy={busy}
                            save={async (b) =>
                              !!(await run(
                                "admin/credit-status",
                                b,
                                "Credit updated; history preserved.",
                              ))
                            }
                          />
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty title="No attendance recorded">
                    Event attendance and manual awards will appear here with
                    their point values.
                  </Empty>
                )}
              </Panel>
            </>
          )}
          {tab === "applications" &&
            (editingForm !== undefined ? (
              <FormEditor
                initial={editingForm}
                semesters={data.semesters}
                selectedSemester={semester}
                busy={busy}
                cancel={() => setEditingForm(undefined)}
                save={async (b) => {
                  if (await run("admin/forms", b, "Application saved."))
                    setEditingForm(undefined);
                }}
              />
            ) : application ? (
              <ApplicationView
                key={application.id}
                form={application}
                defaultEmail={defaultConfirmationEmail(
                  data.accounts.find((a) => a.id === data.actor.id)?.contacts ??
                    {},
                )}
                existing={data.submissions.find(
                  (s) => s.form_id === application.id,
                )}
                admin={admin}
                busy={busy}
                cancel={() => setApplication(null)}
                save={async (b) => {
                  const r = await run<Submission>(
                    "submissions/save",
                    b,
                    (b as { submit: boolean }).submit
                      ? "Application submitted."
                      : "Draft saved.",
                  );
                  return r;
                }}
              />
            ) : (
              <Panel title="Society applications">
                {forms.length ? (
                  <div className="forms-list">
                    {forms.map((f) => {
                      const s = data.submissions.find(
                        (s) => s.form_id === f.id,
                      );
                      const closed =
                        !f.published ||
                        !!(f.deadline && Date.parse(f.deadline) < Date.now());
                      return (
                        <article className="form-row" key={f.id}>
                          <div>
                            <Pill tone={closed ? "neutral" : "green"}>
                              {admin
                                ? closed
                                  ? "Closed"
                                  : "Published"
                                : s
                                  ? status(s.status)
                                  : closed
                                    ? "Closed"
                                    : "Open"}
                            </Pill>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                            <small>
                              {f.kind === "FUNDING"
                                ? "Society funding"
                                : "Cross-collaboration High Impact event"}
                              {f.deadline && ` · Due ${when(f.deadline)} CT`}
                            </small>
                          </div>
                          <div className="actions">
                            {admin && (
                              <Button
                                secondary
                                onClick={() => setEditingForm(f)}
                              >
                                Edit form
                              </Button>
                            )}
                            <Button
                              secondary={admin}
                              onClick={() => setApplication(f)}
                            >
                              {admin
                                ? "Preview"
                                : s
                                  ? "View application"
                                  : closed
                                    ? "View form"
                                    : "Start application"}
                              <ArrowRight size={16} />
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Empty title="No applications in this semester">
                    {admin
                      ? "Create a form for Society Funding or Cross-collaboration High Impact event approval."
                      : "SEC will publish application forms here when they are ready."}
                  </Empty>
                )}
              </Panel>
            ))}
          {tab === "reviews" &&
            admin &&
            (review ? (
              <ReviewView
                retryEmail={async (id) => {
                  await run(
                    "admin/email-retry",
                    { id },
                    "Confirmation email queued for retry.",
                  );
                }}
                submission={
                  data.submissions.find((s) => s.id === review.id) ?? review
                }
                busy={busy}
                cancel={() => setReview(null)}
                save={async (b) => {
                  if (await run("admin/review", b, "Review saved."))
                    setReview(null);
                }}
              />
            ) : (
              <Panel title="Submitted applications">
                {data.submissions.filter(
                  (s) =>
                    s.status !== "DRAFT" &&
                    forms.some((f) => f.id === s.form_id),
                ).length ? (
                  <div className="record-list">
                    {data.submissions
                      .filter(
                        (s) =>
                          s.status !== "DRAFT" &&
                          forms.some((f) => f.id === s.form_id),
                      )
                      .map((s) => (
                        <div className="record" key={s.id}>
                          <div>
                            <strong>{s.society_name}</strong>
                            <small>
                              {s.form_title} · {when(s.updated_at)}
                            </small>
                          </div>
                          <Pill
                            tone={s.status === "APPROVED" ? "green" : "neutral"}
                          >
                            {status(s.status)}
                          </Pill>
                          <Button secondary onClick={() => setReview(s)}>
                            Review
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Empty title="The review queue is clear">
                    Submitted society applications will appear here.
                  </Empty>
                )}
              </Panel>
            ))}
          {tab === "societies" && admin && (
            <>
              <Panel
                title="Society directory"
                action={
                  <Button
                    onClick={() => {
                      setProvision(true);
                      setSelectedRoster([]);
                    }}
                  >
                    <Plus size={16} />
                    Add society
                  </Button>
                }
              >
                {societies.length ? (
                  <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable data table"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Society</th>
                          <th>Account</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {societies.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.display_name}</strong>
                              <small>@{a.username}</small>
                              <details>
                                <summary>Contact responses</summary>
                                <ContactInfo contacts={a.contacts} />
                              </details>
                            </td>
                            <td>
                              <Pill tone={a.enabled ? "green" : "neutral"}>
                                {a.enabled
                                  ? a.activated
                                    ? "Active"
                                    : "Awaiting setup"
                                  : "Disabled"}
                              </Pill>
                            </td>
                            <td>
                              <div className="actions">
                                <Button
                                  secondary
                                  disabled={busy || !a.enabled}
                                  onClick={async () => {
                                    const r = await run<{
                                      username: string;
                                      activation: string;
                                    }>("admin/activation", { accountId: a.id });
                                    if (r) setActivation(r);
                                  }}
                                >
                                  Issue setup / reset link
                                </Button>
                                <Button
                                  secondary
                                  disabled={busy}
                                  onClick={() =>
                                    void run(
                                      "admin/account-status",
                                      { accountId: a.id, enabled: !a.enabled },
                                      a.enabled
                                        ? "Society disabled."
                                        : "Society enabled.",
                                    )
                                  }
                                >
                                  {a.enabled ? "Disable" : "Enable"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="No society accounts yet">
                    Select roster responses below or add a society manually.
                  </Empty>
                )}
              </Panel>
              <Panel
                title={`Contact roster review · ${data.roster.length} unassigned responses`}
              >
                <p className="section-intro">
                  Select all responses that belong to one society, then create
                  one account. Original names and contacts are retained. Review
                  name variations before combining.
                </p>
                {data.roster.length ? (
                  <>
                    <div className="roster-toolbar">
                      <span>{selectedRoster.length} selected</span>
                      <Button
                        disabled={!selectedRoster.length}
                        onClick={() => setProvision(true)}
                      >
                        Create account from selection
                      </Button>
                      <button
                        className="text-button"
                        onClick={() => setSelectedRoster([])}
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="roster-list">
                      {data.roster.map((r) => (
                        <div className="roster-row" key={r.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedRoster.includes(r.id)}
                              onChange={(e) =>
                                setSelectedRoster(
                                  e.target.checked
                                    ? [...selectedRoster, r.id]
                                    : selectedRoster.filter(
                                        (id) => id !== r.id,
                                      ),
                                )
                              }
                            />
                            <span>
                              <strong>{r.name}</strong>
                              <small>{r.source_timestamp}</small>
                            </span>
                          </label>
                          <details>
                            <summary>Contacts</summary>
                            <ContactInfo contacts={r.contacts} />
                          </details>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty title="No pending contact responses">
                    The supplied roster is staged in production for SEC review.
                    More CSV responses can be staged with the documented import
                    command.
                  </Empty>
                )}
              </Panel>
              {provision && (
                <ProvisionForm
                  selected={data.roster.filter((r) =>
                    selectedRoster.includes(r.id),
                  )}
                  busy={busy}
                  cancel={() => setProvision(false)}
                  save={async (b) => {
                    const r = await run<{
                      username: string;
                      activation: string;
                    }>("admin/societies", b, "Society account created.");
                    if (r) {
                      setActivation(r);
                      setProvision(false);
                      setSelectedRoster([]);
                    }
                  }}
                />
              )}
            </>
          )}
          {tab === "settings" && (
            <>
              <PasswordForm
                busy={busy}
                save={async (b) => {
                  await run(
                    "auth/password",
                    b,
                    "Password changed. Sign in again.",
                  );
                }}
              />
              {admin && (
                <>
                  <SemesterManager data={data} busy={busy} run={run} />
                  <Allowlist data={data} busy={busy} run={run} />
                  <Panel title="Recent administrative activity">
                    <div className="record-list">
                      {data.audit.map((a) => (
                        <div className="record" key={a.id}>
                          <div>
                            <strong>{status(a.action)}</strong>
                            <small>
                              @{a.actor_name ?? "system"} · {when(a.created_at)}{" "}
                              CT
                            </small>
                            <small>
                              {Object.entries(a.details)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(" · ")}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </>
              )}
            </>
          )}
          <footer className="footer">
            <span>SocietyHub</span>
            <span>Student Engineers’ Council · Texas A&M</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function AuthScreen({
  activate = false,
  token = "",
  checkin = false,
  error,
  busy,
  onSubmit,
}: {
  activate?: boolean;
  token?: string;
  checkin?: boolean;
  error: string;
  busy: boolean;
  onSubmit: (b: unknown) => Promise<void>;
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [localError, setLocalError] = useState("");
  return (
    <main className="auth-page">
      <section className="auth-story">
        <MaroonRibbons />
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
        <div>
          <h1>
            Engineering is better
            <br />
            together.
          </h1>
          <p>
            The shared home for Texas A&M’s engineering societies and the
            Student Engineers’ Council.
          </p>
          <div className="auth-topics">
            <span>
              <FileText size={17} aria-hidden="true" />
              Society funding
            </span>
            <span>
              <CalendarDays size={17} aria-hidden="true" />
              Event check-in
            </span>
            <span>
              <Users size={17} aria-hidden="true" />
              Cross-collaboration
            </span>
          </div>
        </div>
        <p className="auth-footer">
          Built around your society. Connected through SEC.
        </p>
      </section>
      <section className="auth-main">
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
              : "Use your society username and shared password. SEC chairs use the SEC account."}
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
                  autoFocus
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
              hint={activate ? "Use at least 12 characters." : undefined}
            >
              <input
                required
                type="password"
                autoComplete={activate ? "new-password" : "current-password"}
                minLength={activate ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {activate && (
              <Field label="Confirm password">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
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
function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false),
    [err, setErr] = useState(false);
  return (
    <div className="copy-link">
      <input
        readOnly
        aria-label="Shareable link"
        value={value}
        onFocus={(e) => e.target.select()}
      />
      <Button
        secondary
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setErr(false);
          } catch {
            setErr(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Copied" : "Copy"}
      </Button>
      {err && <small role="status">Select and copy the link manually.</small>}
    </div>
  );
}
function EventEditor({
  initial,
  semesters,
  selectedSemester,
  busy,
  cancel,
  save,
}: {
  initial: Event | null;
  semesters: HubData["semesters"];
  selectedSemester: string;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [description, setDescription] = useState(initial?.description ?? ""),
    [location, setLocation] = useState(initial?.location ?? ""),
    [category, setCategory] = useState(initial?.category ?? "PRT"),
    [semester, setSemester] = useState(
      initial?.semester_id ?? selectedSemester,
    ),
    [start, setStart] = useState(initial ? localDate(initial.starts_at) : ""),
    [end, setEnd] = useState(initial ? localDate(initial.ends_at) : ""),
    [open, setOpen] = useState(initial?.checkin_open ?? false);
  return (
    <Panel title={initial ? "Edit event" : "Create event"}>
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            id: initial?.id,
            semesterId: semester,
            name,
            description,
            location,
            category,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            checkinOpen: open,
          });
        }}
      >
        <Field label="Event name">
          <input
            autoFocus
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Semester">
            <select
              disabled={!!initial}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Event category">
            <select
              disabled={!!initial}
              value={category}
              onChange={(e) => setCategory(e.target.value as Event["category"])}
            >
              <option value="PRT">PRT · 1 point</option>
              <option value="STANDARD">Standard · 1 point</option>
              <option value="HIGH_IMPACT">
                High Impact · 2 points, manual SEC award
              </option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            maxLength={300}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Check-in window starts"
            hint="Enter times in your device’s local timezone."
          >
            <input
              required
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Check-in window ends">
            <input
              required
              type="datetime-local"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        {category !== "HIGH_IMPACT" && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={open}
              onChange={(e) => setOpen(e.target.checked)}
            />
            Enable check-in within this window
          </label>
        )}
        <FormActions
          busy={busy}
          onCancel={cancel}
          label={initial ? "Save event" : "Create event"}
        />
      </form>
    </Panel>
  );
}
function QRPanel({
  event,
  close,
  rotate,
  busy,
}: {
  event: Event;
  close: () => void;
  rotate: () => Promise<void>;
  busy: boolean;
}) {
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  const link = `${window.location.origin}/checkin/${event.id}?token=${event.checkin_token}`;
  useEffect(() => {
    void QRCode.toDataURL(link, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#500000", light: "#ffffff" },
    })
      .then(setSrc)
      .catch(() =>
        setError("Unable to generate QR code. Use the sign-in link below."),
      );
  }, [link]);
  return (
    <Panel
      title={`Check-in · ${event.name}`}
      action={
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close QR panel"
        >
          <X />
        </button>
      }
    >
      <div className="qr-layout">
        {src && (
          <img
            src={src}
            width={260}
            height={260}
            alt={`Check-in QR code for ${event.name}`}
          />
        )}
        <div>
          <p>Display this QR code at the event or share the sign-in link.</p>
          <p>
            {when(event.starts_at)} – {when(event.ends_at)} CT
          </p>
          <Pill tone={event.checkin_open ? "green" : "neutral"}>
            {event.checkin_open
              ? "Enabled within event window"
              : "Check-in disabled"}
          </Pill>
          {error && <p role="alert">{error}</p>}
          <CopyLink value={link} />
          <div className="actions">
            <a
              className="button secondary"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              Open sign-in link <ExternalLink size={15} />
            </a>
            <Button secondary disabled={busy} onClick={() => void rotate()}>
              Replace link & QR
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
function ManualAward({
  events,
  societies,
  busy,
  save,
}: {
  events: Event[];
  societies: Account[];
  busy: boolean;
  save: (b: unknown) => Promise<boolean>;
}) {
  const [event, setEvent] = useState(""),
    [account, setAccount] = useState(""),
    [note, setNote] = useState("");
  return (
    <Panel title="Award High Impact credit">
      <p className="section-intro">
        Record qualifying participation after SEC verification. Each society
        receives two points once per event.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save({ eventId: event, accountId: account, note }))
            setNote("");
        }}
      >
        <div className="form-grid">
          <Field label="High Impact event">
            <select
              required
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            >
              <option value="">Select event</option>
              {events.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Society">
            <select
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Select society</option>
              {societies.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Verification note">
          <input
            required
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How was this society’s participation verified?"
          />
        </Field>
        <Button
          type="submit"
          disabled={busy || !events.length || !societies.length}
        >
          Award 2 points
        </Button>
      </form>
    </Panel>
  );
}
function CreditCorrection({
  id,
  revoked,
  busy,
  save,
}: {
  id: string;
  revoked: boolean;
  busy: boolean;
  save: (b: unknown) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false),
    [note, setNote] = useState("");
  return (
    <div className="correction">
      {open ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await save({ id, revoke: !revoked, note })) {
              setOpen(false);
              setNote("");
            }
          }}
        >
          <Field label="Reason for correction">
            <input
              required
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="actions">
            <Button disabled={busy} type="submit">
              {revoked ? "Restore credit" : "Remove credit"}
            </Button>
            <Button secondary onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button secondary onClick={() => setOpen(true)}>
          {revoked ? "Restore" : "Correct"}
        </Button>
      )}
    </div>
  );
}
function FormEditor({
  initial,
  semesters,
  selectedSemester,
  busy,
  cancel,
  save,
}: {
  initial: Form | null;
  semesters: HubData["semesters"];
  selectedSemester: string;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? ""),
    [description, setDescription] = useState(initial?.description ?? ""),
    [kind, setKind] = useState(initial?.kind ?? "FUNDING"),
    [semester, setSemester] = useState(
      initial?.semester_id ?? selectedSemester,
    ),
    [published, setPublished] = useState(initial?.published ?? false),
    [deadline, setDeadline] = useState(
      initial?.deadline ? localDate(initial.deadline) : "",
    ),
    [questions, setQuestions] = useState<Question[]>(
      initial?.questions ?? [
        {
          id: crypto.randomUUID(),
          label: "",
          type: "short",
          required: true,
          options: [],
        },
      ],
    );
  const update = (i: number, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, offset: number) => {
    setQuestions((q) => {
      const result = [...q];
      [result[i], result[i + offset]] = [result[i + offset], result[i]];
      return result;
    });
  };
  return (
    <Panel
      title={initial ? "Edit application form" : "Create application form"}
    >
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            id: initial?.id,
            semesterId: semester,
            title,
            description,
            kind,
            published,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            questions,
          });
        }}
      >
        <Field label="Application title">
          <input
            required
            autoFocus
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Semester">
            <select
              required
              disabled={!!initial}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Application type">
            <select
              disabled={!!initial}
              value={kind}
              onChange={(e) => setKind(e.target.value as Form["kind"])}
            >
              <option value="FUNDING">Society Funding</option>
              <option value="HIGH_IMPACT">
                Cross-collaboration High Impact event approval
              </option>
            </select>
          </Field>
        </div>
        <Field label="Instructions">
          <textarea
            rows={3}
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field
          label="Deadline (optional)"
          hint="Enter in your device’s local timezone."
        >
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <h3>Questions</h3>
        <p>
          Existing drafts and submissions keep their question version. New
          applications use your latest published version.
        </p>
        <div className="question-editor">
          {questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>Question {i + 1}</legend>
              <Field label="Question text">
                <input
                  required
                  value={q.label}
                  maxLength={500}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </Field>
              <div className="form-grid">
                <Field label="Answer type">
                  <select
                    value={q.type}
                    onChange={(e) =>
                      update(i, { type: e.target.value as Question["type"] })
                    }
                  >
                    <option value="short">Short answer</option>
                    <option value="long">Long answer</option>
                    <option value="select">Single choice</option>
                    <option value="checkbox">Multiple choices</option>
                    <option value="number">Number</option>
                  </select>
                </Field>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => update(i, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
              {["select", "checkbox"].includes(q.type) && (
                <Field label="Choices (one per line)">
                  <textarea
                    required
                    rows={4}
                    value={q.options.join("\n")}
                    onChange={(e) =>
                      update(i, { options: e.target.value.split("\n") })
                    }
                  />
                </Field>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move question ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move question ${i + 1} down`}
                  disabled={i === questions.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown size={17} />
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={questions.length === 1}
                  onClick={() =>
                    setQuestions(questions.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 size={15} />
                  Remove question
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        <Button
          secondary
          disabled={questions.length >= 50}
          onClick={() =>
            setQuestions([
              ...questions,
              {
                id: crypto.randomUUID(),
                label: "",
                type: "short",
                required: true,
                options: [],
              },
            ])
          }
        >
          <Plus size={16} />
          Add question
        </Button>
        <label className="check-field">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Publish for societies to view and submit
        </label>
        <FormActions busy={busy} onCancel={cancel} label="Save application" />
      </form>
    </Panel>
  );
}
function AnswerFields({
  questions,
  answers,
  setAnswers,
  disabled,
}: {
  questions: Question[];
  answers: Answers;
  setAnswers: (a: Answers) => void;
  disabled: boolean;
}) {
  return (
    <div className="answer-fields">
      {questions.map((q) => {
        const value = answers[q.id] ?? (q.type === "checkbox" ? [] : "");
        const set = (v: string | string[]) =>
          setAnswers({ ...answers, [q.id]: v });
        if (q.type === "checkbox")
          return (
            <fieldset className="choice-field" key={q.id}>
              <legend>
                {q.label}
                {q.required ? " *" : ""}
              </legend>
              {q.options.map((option, i) => (
                <label className="check-field" key={i}>
                  <input
                    disabled={disabled}
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option)}
                    onChange={(e) => {
                      const v = Array.isArray(value) ? value : [];
                      set(
                        e.target.checked
                          ? [...v, option]
                          : v.filter((x) => x !== option),
                      );
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          );
        return (
          <Field key={q.id} label={q.label + (q.required ? " *" : "")}>
            {q.type === "long" ? (
              <textarea
                disabled={disabled}
                rows={5}
                maxLength={20000}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            ) : q.type === "select" ? (
              <select
                disabled={disabled}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">Select an option</option>
                {q.options.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                disabled={disabled}
                type={q.type === "number" ? "number" : "text"}
                step="any"
                maxLength={20000}
                value={String(value)}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
function ApplicationView({
  form,
  defaultEmail,
  existing,
  admin,
  busy,
  cancel,
  save,
}: {
  form: Form;
  defaultEmail: string;
  existing?: Submission;
  admin: boolean;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<Submission | undefined>;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState(
    existing?.confirmation_email || defaultEmail,
  );
  const [answers, setAnswers] = useState<Answers>(existing?.answers ?? {}),
    [revision, setRevision] = useState(existing?.revision ?? 0),
    [savedAt, setSavedAt] = useState(existing?.updated_at ?? "");
  const closed =
    !form.published ||
    !!(form.deadline && Date.parse(form.deadline) < Date.now());
  const readOnly =
    admin ||
    closed ||
    !!(existing && !["DRAFT", "CHANGES_REQUESTED"].includes(existing.status));
  const questions = existing?.questions ?? form.questions;
  const persist = async (submit: boolean) => {
    const r = await save({
      formId: form.id,
      answers,
      submit,
      revision,
      confirmationEmail,
    });
    if (r) {
      setRevision(r.revision);
      setSavedAt(r.updated_at);
    }
  };
  return (
    <Panel
      title={form.title}
      action={
        <Button secondary onClick={cancel}>
          Back to applications
        </Button>
      }
    >
      <p className="section-intro">{form.description}</p>
      <div className="inline">
        <Pill>
          {admin
            ? "Admin preview"
            : existing
              ? status(existing.status)
              : closed
                ? "Closed"
                : "Not started"}
        </Pill>
        <small>
          Question version {existing?.form_version ?? form.current_version}
          {form.deadline && ` · Due ${when(form.deadline)} CT`}
        </small>
      </div>
      {existing?.review_note && (
        <div className="review-note">
          <h3>SEC feedback</h3>
          <p>{existing.review_note}</p>
        </div>
      )}
      {form.kind === "HIGH_IMPACT" && (
        <p>
          Event approval and point awards are separate. SEC records High Impact
          points manually.
        </p>
      )}
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void persist(true);
        }}
      >
        <Field
          label="Confirmation email"
          hint="We’ll send a receipt here when you submit. An officer’s personal email is fine."
        >
          <input
            type="email"
            autoComplete="email"
            maxLength={254}
            value={confirmationEmail}
            onChange={(e) => setConfirmationEmail(e.target.value)}
            disabled={readOnly || busy}
          />
        </Field>
        <ReceiptStatus submission={existing} />
        <AnswerFields
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          disabled={readOnly || busy}
        />
        {!readOnly && (
          <div className="actions">
            <Button
              secondary
              disabled={busy}
              onClick={() => void persist(false)}
            >
              Save draft
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Submit application"}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
        {savedAt && <small>Last saved {when(savedAt)} CT</small>}
      </form>
    </Panel>
  );
}
function ReviewView({
  submission: s,
  retryEmail,
  busy,
  cancel,
  save,
}: {
  submission: Submission;
  retryEmail: (id: string) => Promise<void>;
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const [decision, setDecision] = useState(
      ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "DENIED"].includes(
        s.status,
      )
        ? s.status
        : "UNDER_REVIEW",
    ),
    [note, setNote] = useState(s.review_note);
  return (
    <Panel
      title={s.society_name}
      action={
        <Button secondary onClick={cancel}>
          Back to queue
        </Button>
      }
    >
      <h3>{s.form_title}</h3>
      <div className="inline">
        <Pill>{status(s.status)}</Pill>
        <small>
          Question version {s.form_version} · Submitted{" "}
          {s.submitted_at ? when(s.submitted_at) : "—"}
        </small>
      </div>
      <ReceiptStatus submission={s} />
      {s.confirmation_email_id &&
        s.confirmation_status !== "SENT" &&
        (s.confirmation_attempts ?? 0) < 5 && (
          <Button
            secondary
            disabled={busy}
            onClick={() => void retryEmail(s.confirmation_email_id!)}
          >
            Retry confirmation email
          </Button>
        )}
      <div className="review-answers">
        {s.questions.map((q) => (
          <section key={q.id}>
            <h4>{q.label}</h4>
            <p>
              {Array.isArray(s.answers[q.id])
                ? (s.answers[q.id] as string[]).join(", ")
                : s.answers[q.id] || "No answer provided"}
            </p>
          </section>
        ))}
      </div>
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ id: s.id, status: decision, note, revision: s.revision });
        }}
      >
        <Field label="Review status">
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="UNDER_REVIEW">Under review</option>
            <option value="CHANGES_REQUESTED">Changes requested</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
          </select>
        </Field>
        <Field label="Feedback visible to the society">
          <textarea
            rows={4}
            required={decision === "CHANGES_REQUESTED"}
            value={note}
            maxLength={5000}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p>Review decisions do not award event points.</p>
        <FormActions busy={busy} onCancel={cancel} label="Save review" />
      </form>
    </Panel>
  );
}
function ProvisionForm({
  selected,
  busy,
  cancel,
  save,
}: {
  selected: Candidate[];
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
}) {
  const [name, setName] = useState(selected[0]?.name ?? ""),
    [username, setUsername] = useState("");
  return (
    <Panel title="Create society account">
      <p className="section-intro">
        {selected.length
          ? `${selected.length} selected contact responses will be attached to this account. Confirm they all belong to the same society.`
          : "Create an account for a society not yet in the contact roster."}
      </p>
      {selected.map((s) => (
        <p key={s.id}>
          {s.name} · {s.source_timestamp}
        </p>
      ))}
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            displayName: name,
            username,
            candidateIds: selected.map((s) => s.id),
          });
        }}
      >
        <Field label="Society display name">
          <input
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Society username"
          hint="2–40 lowercase letters, numbers, dots, hyphens, or underscores."
        >
          <input
            required
            pattern="[a-z0-9][a-z0-9._\-]{1,39}"
            maxLength={40}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
        </Field>
        <FormActions
          busy={busy}
          onCancel={cancel}
          label="Create & issue setup link"
        />
      </form>
    </Panel>
  );
}
function PasswordForm({
  busy,
  save,
}: {
  busy: boolean;
  save: (b: unknown) => Promise<void>;
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [err, setErr] = useState("");
  return (
    <Panel title="Change shared password">
      <p className="section-intro">
        Changing your password signs out all sessions. Share the new password
        only with authorized officers.
      </p>
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) {
            setErr("Passwords do not match.");
            return;
          }
          setErr("");
          void save({ currentPassword: current, password });
        }}
      >
        <Field label="Current password">
          <input
            required
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="New password">
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </div>
        {err && <p role="alert">{err}</p>}
        <Button disabled={busy} type="submit">
          Change password
        </Button>
      </form>
    </Panel>
  );
}
type Run = (path: string, body: unknown, message?: string) => Promise<unknown>;
function SemesterManager({
  data,
  busy,
  run,
}: {
  data: HubData;
  busy: boolean;
  run: Run;
}) {
  const [name, setName] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [current, setCurrent] = useState(false);
  return (
    <Panel title="Semesters">
      <div className="record-list">
        {data.semesters.map((s) => (
          <div className="record" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <small>
                {String(s.starts_on).slice(0, 10)} –{" "}
                {String(s.ends_on).slice(0, 10)}
              </small>
            </div>
            {s.is_current ? (
              <Pill tone="green">Current</Pill>
            ) : (
              <Button
                secondary
                disabled={busy}
                onClick={() =>
                  void run(
                    "admin/current-semester",
                    { id: s.id },
                    "Current semester changed. Historical points are preserved.",
                  )
                }
              >
                Make current
              </Button>
            )}
          </div>
        ))}
      </div>
      <form
        className="editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              "admin/semesters",
              { name, startsOn: start, endsOn: end, current },
              "Semester created.",
            )
          ) {
            setName("");
            setStart("");
            setEnd("");
          }
        }}
      >
        <h3>Add semester</h3>
        <Field label="Semester name">
          <input
            required
            placeholder="Spring 2027"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Start date">
            <input
              required
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="End date">
            <input
              required
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <label className="check-field">
          <input
            type="checkbox"
            checked={current}
            onChange={(e) => setCurrent(e.target.checked)}
          />
          Make this the current semester
        </label>
        <Button type="submit" disabled={busy}>
          Add semester
        </Button>
      </form>
    </Panel>
  );
}
function Allowlist({
  data,
  busy,
  run,
}: {
  data: HubData;
  busy: boolean;
  run: Run;
}) {
  const [email, setEmail] = useState("");
  return (
    <Panel title="Future Google admin access">
      <p className="section-intro">
        Google OAuth is planned. This whitelist is stored for that integration;
        it does not currently grant sign-in access. The SEC username/password
        account remains active.
      </p>
      {data.allowlist.map((a) => (
        <div className="record" key={a.email}>
          <span>{a.email}</span>
          <Button
            secondary
            disabled={busy}
            onClick={() =>
              void run(
                "admin/allowlist",
                { email: a.email, remove: true },
                "Whitelist entry removed.",
              )
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              "admin/allowlist",
              { email, remove: false },
              "Whitelist entry saved.",
            )
          )
            setEmail("");
        }}
      >
        <Field label="TAMU email address">
          <input
            type="email"
            required
            pattern="[^@]+@tamu\.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button disabled={busy} type="submit">
          Add email
        </Button>
      </form>
    </Panel>
  );
}
function exportCredits(credits: HubData["credits"]) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = [
    [
      "Society",
      "Event",
      "Category",
      "Points",
      "Source",
      "Awarded at",
      "Status",
      "Note",
    ],
    ...credits.map((c) => [
      c.society_name,
      c.event_name,
      labels[c.category],
      c.points,
      c.source,
      c.created_at,
      c.revoked_at ? "Removed" : "Active",
      c.note,
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "society-attendance.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ReceiptStatus({ submission: s }: { submission?: Submission }) {
  if (!s?.confirmation_status) return null;
  return (
    <p className="receipt-status">
      {s.confirmation_status === "SENT"
        ? `Confirmation email sent to ${s.confirmation_email}.`
        : s.confirmation_status === "FAILED"
          ? `Your application is saved. The confirmation email to ${s.confirmation_email} could not be sent; SEC can retry it.`
          : `Confirmation email to ${s.confirmation_email} is queued for sending.`}
    </p>
  );
}
