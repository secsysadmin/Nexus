"use client";
import { useCallback, useEffect, useState, useRef } from "react";
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
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Panel,
  Field,
  FormActions,
  Pill,
  Empty,
  DashboardSection,
  PasswordInput,
} from "./ui";
import { when, status } from "./format";
import { CopyLink, EventEditor, QRPanel } from "./event-management";
import {
  FormEditor,
  ApplicationView,
  ReviewView,
} from "./application-management";
import ThemeToggle from "./theme-toggle";
import AuthScreen from "./auth-screen";
import PointsSummary from "./points-summary";
import AdminInsights from "./admin-insights";
import ContactEditor from "./contact-editor";
import LoadingSkeleton from "./loading-skeleton";
import { confirmDiscard } from "./unsaved-changes";
import { checkinStatus } from "../lib/checkin-status";
import EventCalendar from "./event-calendar";
import { dashboardItems } from "../lib/dashboard";
import { groupSocietyRoster, rosterGroupMatches } from "../lib/society-roster";
import { defaultConfirmationEmail } from "../lib/application-email";
import type {
  HubData,
  Event,
  Form,
  Submission,
  Candidate,
  Account,
} from "../lib/types";
import { labels } from "../lib/domain";
type Run = (path: string, body: unknown, message?: string) => Promise<unknown>;
type ContactInfoProps = {
  contacts: Record<string, unknown>;
};
type CreditCorrectionProps = {
  id: string;
  revoked: boolean;
  busy: boolean;
  save: (b: unknown) => Promise<boolean>;
};
type PasswordFormProps = {
  busy: boolean;
  save: (b: unknown) => Promise<void>;
};
type PointResetProps = {
  data: HubData;
  busy: boolean;
  run: Run;
};
type AllowlistProps = {
  data: HubData;
  busy: boolean;
  run: Run;
};

type ManualAwardProps = {
  events: Event[];
  societies: Account[];
  busy: boolean;
  save: (b: unknown) => Promise<boolean>;
};
type ProvisionFormProps = {
  selected: Candidate[];
  busy: boolean;
  cancel: () => void;
  save: (b: unknown) => Promise<void>;
};
const REFRESH_INTERVAL_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;
const pendingRequestKeys = new Map<string, string>();
class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Request failed.";
async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const create =
    body &&
    ["admin/events", "admin/forms"].includes(path) &&
    !(body as { id?: string }).id;
  let storageKey: string | undefined, key: string | undefined;
  if (create) {
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(body)),
    );
    storageKey =
      "societyhub.pending:" +
      path +
      ":" +
      Array.from(new Uint8Array(bytes), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    try {
      key = sessionStorage.getItem(storageKey) ?? undefined;
    } catch {}
    key = key ?? pendingRequestKeys.get(storageKey) ?? crypto.randomUUID();
    pendingRequestKeys.set(storageKey, key);
    try {
      sessionStorage.setItem(storageKey, key);
    } catch {}
  }
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type": "application/json",
              ...(key ? { "X-Idempotency-Key": key } : {}),
            },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await res.json().catch(() => {
      throw new Error(
        "The server returned an unreadable response. Refresh to check your changes before retrying.",
      );
    });
    if (!res.ok)
      throw new RequestError(data.error ?? "Request failed.", res.status);
    if (storageKey) {
      pendingRequestKeys.delete(storageKey);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted || error instanceof TypeError)
      throw Object.assign(
        new Error(
          body === undefined
            ? "The workspace took too long to respond. Try refreshing."
            : "Couldn’t confirm whether your changes were saved. Refresh to check before retrying.",
        ),
        { outcomeUnknown: body !== undefined },
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function ContactInfo({ contacts }: ContactInfoProps) {
  const readable = (key: string) =>
    key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const flatten = (value: unknown, path: string[] = []): [string, string][] => {
    if (Array.isArray(value))
      return value.flatMap((v, i) => flatten(v, [...path, `Entry ${i + 1}`]));
    if (value && typeof value === "object")
      return Object.entries(value).flatMap(([key, v]) =>
        flatten(v, [...path, readable(key)]),
      );
    return value === null || value === undefined || String(value).trim() === ""
      ? []
      : [[path.join(" · "), String(value)]];
  };
  const responses = Array.isArray(contacts.responses)
    ? [
        ...(contacts.current ? [{ current: contacts.current }] : []),
        ...contacts.responses,
      ]
    : [contacts];
  const groups = responses
    .map((response) => flatten(response))
    .filter((rows) => rows.length);
  return groups.length ? (
    <div className="contact-details">
      {groups.map((rows, index) => (
        <dl key={index}>
          {rows.map(([label, value], i) => (
            <div key={i}>
              <dt>{label}</dt>
              <dd>
                {/email/i.test(label) &&
                /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? (
                  <a href={`mailto:${value}`}>{value}</a>
                ) : /phone/i.test(label) && /^[+()\d.\s-]{7,}$/.test(value) ? (
                  <a href={`tel:${value.replace(/[^+\d]/g, "")}`}>{value}</a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  ) : (
    <p className="contact-empty">No contact details are on file.</p>
  );
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
    [mobile, setMobile] = useState(false);
  const [route, setRoute] = useState<{
    mode: string;
    token: string;
    eventId: string;
  }>({ mode: "home", token: "", eventId: "" });
  const deepLinkOpened = useRef(false);
  const currentView = useRef("overview");
  currentView.current = tab;
  const refreshVersion = useRef(0);
  const collectionQueries = useRef<
    Record<string, { search: string; nextOffset: number }>
  >({});
  const calendarRequest = useRef(0),
    calendarMonth = useRef("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<Event[] | null>(null);
  const [contactAccount, setContactAccount] = useState<Account | null>(null);
  const [directorySearch, setDirectorySearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [eventsView, setEventsView] = useState<"list" | "calendar">("list");
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
  useEffect(() => {
    if (checkResult) document.getElementById("checkin-result-heading")?.focus();
  }, [checkResult]);
  const [conflict, setConflict] = useState(false);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [reopenEventId, setReopenEventId] = useState<string | null>(null);
  const [applicationSubmission, setApplicationSubmission] = useState<
    Submission | undefined
  >();
  const [archivedCredits, setArchivedCredits] = useState<HubData["credits"]>(
    [],
  );
  const [historyMore, setHistoryMore] = useState(true);
  const selectedContacts = useRef(new Map<string, Candidate>());
  useEffect(() => {
    for (const candidate of data?.roster ?? [])
      if (selectedRoster.includes(candidate.id))
        selectedContacts.current.set(candidate.id, candidate);
    for (const id of selectedContacts.current.keys())
      if (!selectedRoster.includes(id)) selectedContacts.current.delete(id);
  }, [selectedRoster, data?.roster]);
  useEffect(() => {
    setArchivedCredits([]);
    setHistoryMore(true);
  }, [data?.pointCycle.id]);
  const openApplication = async (form: Form) => {
    setBusy(true);
    setError("");
    try {
      const detail = await api<{ form: Form; submission?: Submission }>(
        "forms/" + form.id,
      );
      setApplication(detail.form);
      setApplicationSubmission(detail.submission);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openFormEditor = async (form: Form) => {
    setBusy(true);
    setError("");
    try {
      setEditingForm((await api<{ form: Form }>("forms/" + form.id)).form);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openReview = async (submission: Submission) => {
    setBusy(true);
    setError("");
    try {
      setReview(await api<Submission>("submissions/" + submission.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const loadHistory = async () => {
    setBusy(true);
    setError("");
    try {
      const page = await api<{ items: HubData["credits"]; hasMore: boolean }>(
        "activity/history?offset=" + archivedCredits.length,
      );
      setArchivedCredits((old) => [...old, ...page.items]);
      setHistoryMore(page.hasMore);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const exportHistory = async () => {
    setBusy(true);
    setError("");
    try {
      let all = [...(data?.credits ?? [])],
        offset = 0;
      while (true) {
        const page = await api<{ items: HubData["credits"]; hasMore: boolean }>(
          "activity/history?offset=" + offset,
        );
        all.push(...page.items);
        if (!page.hasMore) break;
        offset += page.items.length;
      }
      exportCredits(all);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const loadCollection = async (
    kind: "events" | "forms" | "submissions" | "accounts" | "roster",
    search = "",
    replace = false,
  ) => {
    setBusy(true);
    setError("");
    try {
      const offset = replace ? 0 : (data?.pagination?.[kind]?.nextOffset ?? 0);
      const page = await api<{
        items: any[];
        hasMore: boolean;
        nextOffset: number;
      }>(
        `collections/${kind}?offset=${offset}&search=${encodeURIComponent(search)}`,
      );
      collectionQueries.current[kind] = { search, nextOffset: page.nextOffset };
      setData((old) =>
        old
          ? {
              ...old,
              [kind]: replace
                ? page.items
                : [...old[kind], ...page.items].filter(
                    (item, i, all) =>
                      all.findIndex((v) => v.id === item.id) === i,
                  ),
              pagination: {
                ...old.pagination,
                [kind]: { hasMore: page.hasMore, nextOffset: page.nextOffset },
              },
            }
          : old,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const loadCalendar = useCallback(async (month: string) => {
    const request = ++calendarRequest.current;
    calendarMonth.current = month;
    setCalendarLoading(true);
    try {
      let offset = 0,
        items: Event[] = [];
      for (let n = 0; n < 100; n++) {
        const page = await api<{
          items: Event[];
          hasMore: boolean;
          nextOffset: number;
        }>(`events/calendar?month=${month}&offset=${offset}`);
        items.push(...page.items);
        if (!page.hasMore) {
          if (request === calendarRequest.current) setCalendarEvents(items);
          return;
        }
        offset = page.nextOffset;
      }
      throw Error("Too many events for this month. Use the event list.");
    } catch (e) {
      if (request === calendarRequest.current) setError(errorMessage(e));
    } finally {
      if (request === calendarRequest.current) setCalendarLoading(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const version = ++refreshVersion.current;
    try {
      const view = currentView.current;
      const d = await api<HubData>("data?view=" + view);
      for (const [kind, query] of Object.entries(collectionQueries.current)) {
        if (
          !(
            (view === "societies" && ["accounts", "roster"].includes(kind)) ||
            (view === "events" && kind === "events") ||
            (view === "applications" && kind === "forms") ||
            (view === "reviews" && kind === "submissions") ||
            (view === "overview" && kind === "accounts") ||
            (view === "activity" && ["accounts", "events"].includes(kind))
          )
        )
          continue;
        let offset = 0,
          items: any[] = [];
        while (offset < Math.max(query.nextOffset, 1)) {
          const page = await api<{
            items: any[];
            hasMore: boolean;
            nextOffset: number;
          }>(
            `collections/${kind}?offset=${offset}&search=${encodeURIComponent(query.search)}`,
          );
          items.push(...page.items);
          d.pagination = {
            ...d.pagination,
            [kind]: { hasMore: page.hasMore, nextOffset: page.nextOffset },
          };
          if (!page.hasMore || page.nextOffset <= offset) break;
          offset = page.nextOffset;
        }
        (d as any)[kind] = items;
      }
      if (version !== refreshVersion.current) return;
      setData(d);
      if (view === "events" && calendarMonth.current)
        void loadCalendar(calendarMonth.current);
      setAuthNeeded(false);
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) {
        setData(null);
        setAuthNeeded(true);
      } else setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (data) void refresh();
  }, [tab]);
  useEffect(() => {
    if (!data || deepLinkOpened.current) return;
    const id = new URLSearchParams(window.location.search).get("submission");
    if (!id || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id)) return;
    deepLinkOpened.current = true;
    setBusy(true);
    void api<Submission>("submissions/" + id)
      .then(async (submission) => {
        if (data.actor.role === "admin") {
          setTab("reviews");
          setReview(submission);
        } else {
          const detail = await api<{ form: Form; submission?: Submission }>(
            "forms/" + submission.form_id,
          );
          setTab("applications");
          setApplication(detail.form);
          setApplicationSubmission(detail.submission);
        }
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  }, [data?.actor.id]);
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
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".sidebar-close")
      ?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) ?? [],
      ).filter((n) => n.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const resize = () => {
      if (window.innerWidth > 760) setMobile(false);
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", resize);
      queueMicrotask(() => {
        if (window.innerWidth <= 760) menuButtonRef.current?.focus();
      });
    };
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
      token:
        new URLSearchParams(window.location.hash.slice(1)).get("token") ??
        params.get("token") ??
        "",
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
        !review &&
        !contactAccount &&
        !document.querySelector('[data-unsaved-changes="true"]')
      )
        void refresh();
    }, REFRESH_INTERVAL_MS);
    const visible = () => {
      if (
        document.visibilityState === "visible" &&
        !document.querySelector('[data-unsaved-changes="true"]')
      )
        void refresh();
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
    setConflict(false);
    try {
      const result = await api<T>(path, body);
      if (message) setNotice(message);
      await refresh();
      return result;
    } catch (e) {
      setError(errorMessage(e));
      setConflict(e instanceof RequestError && e.status === 409);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const reloadSavedVersion = async () => {
    if (busy || !confirmDiscard()) return;
    setBusy(true);
    try {
      const fresh = await api<HubData>("data");
      setData(fresh);
      if (editingEvent?.id)
        setEditingEvent(await api<Event>("events/" + editingEvent.id));
      if (contactAccount)
        setContactAccount(await api<Account>("accounts/" + contactAccount.id));
      if (editingForm?.id)
        setEditingForm(
          (await api<{ form: Form }>("forms/" + editingForm.id)).form,
        );
      if (application) {
        const detail = await api<{ form: Form; submission?: Submission }>(
          "forms/" + application.id,
        );
        setApplication(detail.form);
        setApplicationSubmission(detail.submission);
      }
      if (review) setReview(await api<Submission>("submissions/" + review.id));
      setEditorGeneration((n) => n + 1);
      setConflict(false);
      setError("");
      setNotice("Loaded the latest saved version.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const navigate = (next: string) => {
    if (busy || !confirmDiscard()) return;
    setContactAccount(null);
    setTab(next);
    if (mobile) menuButtonRef.current?.focus();
    setMobile(false);
    setEditingEvent(undefined);
    setReopenEventId(null);
    setEditingForm(undefined);
    setApplication(null);
    setReview(null);
    setQrEvent(null);
    setProvision(false);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (loading) return <LoadingSkeleton />;
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
  const current = data.pointCycle;
  const events = data.events;
  const credits = data.credits.filter((c) => c.cycle_id === current.id);
  const activeCredits = credits.filter((c) => !c.revoked_at);
  const forms = data.forms;
  const societies = data.accounts.filter((a) => a.role === "society");
  const visibleSocieties = societies.filter((a) =>
    `${a.display_name} ${a.username}`
      .toLowerCase()
      .includes(directorySearch.trim().toLowerCase()),
  );
  const rosterGroups = groupSocietyRoster(data.roster);
  const visibleRoster = rosterGroups.filter((group) =>
    rosterGroupMatches(group, rosterSearch),
  );
  const societyActions = (a: Account) => (
    <div className="actions society-actions">
      <Button
        secondary
        disabled={busy}
        onClick={() => {
          if (!confirmDiscard()) return;
          setContactAccount(a);
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      >
        Edit contacts
      </Button>
      <Button
        secondary
        disabled={busy || !a.enabled}
        aria-label={`Issue setup or reset link for ${a.display_name}`}
        onClick={async () => {
          const result = await run<{ username: string; activation: string }>(
            "admin/activation",
            { accountId: a.id },
          );
          if (result) setActivation(result);
        }}
      >
        Issue setup / reset link
      </Button>
      <Button
        secondary
        disabled={busy}
        aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.display_name}`}
        onClick={() =>
          void run(
            "admin/account-status",
            { accountId: a.id, enabled: !a.enabled },
            a.enabled ? "Society disabled." : "Society enabled.",
          )
        }
      >
        {a.enabled ? "Disable" : "Enable"}
      </Button>
    </div>
  );

  const totals = (id?: string) =>
    ["PRT", "STANDARD", "HIGH_IMPACT"].map((category) =>
      activeCredits
        .filter((c) => c.category === category && (!id || c.account_id === id))
        .reduce((s, c) => s + c.points, 0),
    );
  const dashboard = dashboardItems(data, Date.now());
  const dashboardCounts = data.dashboardCounts ?? {
    pendingReviews: dashboard.pendingReviews.length,
    upcomingEvents: dashboard.upcomingEvents.length,
    missingPrt: dashboard.missingPrt.length,
    awaitingSetup: dashboard.awaitingSetup.length,
    activeSocieties: societies.filter((a) => a.enabled).length,
  };
  const title: Record<string, string> = {
    overview: admin ? "SEC dashboard" : `Hello, ${data.actor.display_name}`,
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
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile || undefined}
        aria-label="Workspace navigation"
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
      {mobile && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation backdrop"
          tabIndex={-1}
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main" inert={mobile}>
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
          <span className="workspace-context">
            <strong title={data.actor.display_name}>
              {data.actor.display_name}
            </strong>
            <span className="breadcrumb">
              / {admin ? "SEC administration" : "Member workspace"}
            </span>
          </span>
          <div className="topbar-actions">
            <ThemeToggle />
            <button
              className={"icon-button" + (refreshing ? " is-refreshing" : "")}
              disabled={refreshing || busy}
              aria-busy={refreshing}
              onClick={() => void refresh()}
              aria-label={
                refreshing ? "Refreshing workspace" : "Refresh workspace"
              }
              title="Reload the latest workspace data"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={tab === "overview" ? "content is-dashboard" : "content"}
        >
          <div className="page-heading">
            <div>
              <h1>{title[tab]}</h1>
              {(admin || tab !== "overview") && (
                <p>
                  {admin
                    ? (
                        {
                          overview:
                            "Review applications, events, and society requirements.",
                          events:
                            "Manage events, check-in windows, and QR codes.",
                          applications:
                            "Create and publish funding and collaboration forms.",
                          activity: "Review attendance and point records.",
                          societies:
                            "Manage society access and reconcile contact responses.",
                          reviews:
                            "Read applications and send decisions or feedback.",
                          settings:
                            "Manage point resets, access, and your SEC password.",
                        } as Record<string, string>
                      )[tab]
                    : (
                        {
                          events:
                            "Find SEC events and check-in windows for your society.",
                          applications:
                            "Complete funding and collaboration applications.",
                          activity:
                            "Your society’s attendance and earned points.",
                          settings:
                            "Manage your society’s contacts and shared password.",
                        } as Record<string, string>
                      )[tab]}
                </p>
              )}
            </div>
            {tab === "overview" && admin && (
              <Button
                onClick={() => {
                  if (dashboardCounts.pendingReviews) {
                    navigate("reviews");
                    void openReview(dashboard.pendingReviews[0]);
                  } else {
                    navigate("events");
                    setEditingEvent(dashboard.upcomingEvents[0] ?? null);
                  }
                }}
              >
                {dashboardCounts.pendingReviews
                  ? "Review next application"
                  : dashboardCounts.upcomingEvents
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
              <span className="alert-message">{error}</span>
              {conflict && (
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => void reloadSavedVersion()}
                >
                  Reload saved version
                </Button>
              )}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {admin &&
            data.outboxHealth &&
            data.outboxHealth.uncertain +
              data.outboxHealth.exhausted +
              data.outboxHealth.delayed >
              0 && (
              <div className="alert error" role="status">
                <span className="alert-message">
                  Some application emails need attention. Applications are
                  saved; review delivery status before resending.
                </span>
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => navigate("reviews")}
                >
                  Review receipts
                </Button>
              </div>
            )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={18} />
              <span className="alert-message">{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss confirmation"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
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
                value={`${window.location.origin}/activate#token=${activation.activation}`}
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
                  <h3
                    id="checkin-result-heading"
                    tabIndex={-1}
                    aria-describedby="checkin-result-detail"
                  >
                    {checkResult.already
                      ? "You’re already checked in."
                      : "You’re checked in."}
                  </h3>
                  <p id="checkin-result-detail">
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
                  {`Points since ${when(current.started_at)} CT`} ·{" "}
                  {admin
                    ? `${dashboardCounts.activeSocieties} active societies`
                    : "Points update automatically after check-in."}
                </p>
                <span>Current points</span>
              </div>
              {!admin ? (
                <>
                  {current && (
                    <PointsSummary
                      key={current.id}
                      credits={credits}
                      cycleId={current.id}
                      accountId={data.actor.id}
                      onHistory={() => navigate("activity")}
                    />
                  )}
                  <DashboardSection
                    title="Upcoming & ongoing events"
                    count={dashboardCounts.upcomingEvents}
                    emptyText="No upcoming events"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("events")}
                      >
                        View events <ArrowUpRight size={16} />
                      </button>
                    }
                  >
                    {dashboardCounts.upcomingEvents ? (
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
                        the current point period.
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
                      emptyText="No published applications"
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
                              void openApplication(f);
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
                  <AdminInsights
                    data={data}
                    counts={dashboardCounts}
                    onActivity={() => navigate("activity")}
                    onSocieties={() => navigate("societies")}
                    onReviews={() => navigate("reviews")}
                  />
                  <DashboardSection
                    title="Applications awaiting review"
                    count={dashboardCounts.pendingReviews}
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
                      Oldest submissions appear first.
                    </p>
                    {dashboardCounts.pendingReviews ? (
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
                              void openReview(item);
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
                        point period.
                      </Empty>
                    )}
                    {dashboardCounts.pendingReviews > 5 && (
                      <small>
                        Showing 5 of {dashboardCounts.pendingReviews}. Open the
                        review queue for all submissions.
                      </small>
                    )}
                  </DashboardSection>
                  <div className="dashboard-grid">
                    <DashboardSection
                      title="Upcoming & ongoing events"
                      count={dashboardCounts.upcomingEvents}
                      emptyText="No upcoming events"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate("events")}
                        >
                          All events <ArrowUpRight size={16} />
                        </button>
                      }
                    >
                      {dashboardCounts.upcomingEvents ? (
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
                                  ? "High Impact · 2 points"
                                  : checkinStatus(event)}
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
                          There are no ongoing or upcoming events in this point
                          period. Add or manage events from the Events tab.
                        </Empty>
                      )}
                      {dashboardCounts.upcomingEvents > 5 && (
                        <small>
                          Showing the next 5 events. Open All events for the
                          full schedule.
                        </small>
                      )}
                    </DashboardSection>
                    <DashboardSection
                      title="PRT minimum not yet met"
                      count={dashboardCounts.missingPrt}
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
                        Enabled societies with less than 1 PRT point. Each
                        society needs 1 PRT point per point period.
                      </p>
                      {dashboardCounts.missingPrt ? (
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
                      {dashboardCounts.missingPrt > 5 && (
                        <small>
                          Showing 5 of {dashboardCounts.missingPrt}. Expand All
                          society point totals below for every society.
                        </small>
                      )}
                    </DashboardSection>
                  </div>
                  <DashboardSection
                    title="Accounts awaiting setup"
                    count={dashboardCounts.awaitingSetup}
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
                      Across all records. These enabled society accounts have
                      not set their password.
                    </p>
                    {dashboardCounts.awaitingSetup ? (
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
                    {dashboardCounts.awaitingSetup > 5 && (
                      <small>
                        Showing 5 of {dashboardCounts.awaitingSetup}. Manage
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
                      {data.pagination?.accounts.hasMore && (
                        <p className="section-intro">
                          Showing loaded societies. Use “Load more societies”
                          below to see the next page.
                        </p>
                      )}
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
            </>
          )}
          {tab === "events" &&
            (editingEvent !== undefined ? (
              <EventEditor
                key={editorGeneration}
                initial={editingEvent}
                reopening={reopenEventId === editingEvent?.id}
                busy={busy}
                cancel={() => {
                  setEditingEvent(undefined);
                  setReopenEventId(null);
                }}
                save={async (body) => {
                  if (
                    await run(
                      "admin/events",
                      body,
                      reopenEventId
                        ? "Check-in enabled for the updated dates. Existing QR links still work."
                        : "Event saved.",
                    )
                  ) {
                    setEditingEvent(undefined);
                    setReopenEventId(null);
                  }
                }}
              />
            ) : (
              <>
                <div className="events-view-toolbar">
                  <span>View events</span>
                  <div
                    className="view-switch"
                    role="group"
                    aria-label="Event view"
                  >
                    <button
                      aria-pressed={eventsView === "list"}
                      onClick={() => setEventsView("list")}
                    >
                      List
                    </button>
                    <button
                      aria-pressed={eventsView === "calendar"}
                      onClick={() => setEventsView("calendar")}
                    >
                      Calendar
                    </button>
                  </div>
                </div>
                <Panel title={admin ? "Society events" : "Society events"}>
                  {eventsView === "calendar" && current ? (
                    <EventCalendar
                      key={current.id}
                      events={calendarEvents ?? events}
                      onMonthChange={data.pagination ? loadCalendar : undefined}
                      loading={calendarLoading}
                      onEdit={admin ? setEditingEvent : undefined}
                      onQr={admin ? setQrEvent : undefined}
                    />
                  ) : events.length ? (
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
                                ? "2 points"
                                : `1 point · ${checkinStatus(e)}`}
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
                                  <button
                                    className="button secondary event-checkin-toggle"
                                    aria-pressed={
                                      e.checkin_open &&
                                      Date.parse(
                                        e.checkin_ends_at ?? e.ends_at,
                                      ) > Date.now()
                                    }
                                    disabled={busy}
                                    onClick={() => {
                                      const now = Date.now();
                                      const enabled =
                                        e.checkin_open &&
                                        Date.parse(
                                          e.checkin_ends_at ?? e.ends_at,
                                        ) > now;
                                      if (
                                        !enabled &&
                                        Date.parse(
                                          e.checkin_ends_at ?? e.ends_at,
                                        ) <= now
                                      ) {
                                        setReopenEventId(e.id);
                                        setEditingEvent({
                                          ...e,
                                          checkin_open: true,
                                        });
                                        return;
                                      }
                                      void run(
                                        "admin/event-checkin",
                                        {
                                          id: e.id,
                                          open: !enabled,
                                          expectedVersion: e.revision,
                                        },
                                        enabled
                                          ? "Check-in paused. Use Enable check-in on this event to turn it back on."
                                          : "Check-in enabled. Existing QR links still work.",
                                      );
                                    }}
                                  >
                                    {e.checkin_open &&
                                    Date.parse(e.checkin_ends_at ?? e.ends_at) >
                                      Date.now()
                                      ? "Pause check-in"
                                      : "Enable check-in"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No events yet">
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
                      return Boolean(
                        await run(
                          "admin/event-checkin",
                          {
                            id: qrEvent.id,
                            expectedVersion: (
                              data.events.find((e) => e.id === qrEvent.id) ??
                              qrEvent
                            ).revision,
                            open: qrEvent.checkin_open,
                            rotate: true,
                          },
                          "A new check-in link was generated. Previous links no longer work.",
                        ),
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
                    <p className="ledger-caption">
                      {credits.filter((c) => !c.revoked_at).length} active{" "}
                      {credits.filter((c) => !c.revoked_at).length === 1
                        ? "record"
                        : "records"}{" "}
                      ·{" "}
                      {credits
                        .filter((c) => !c.revoked_at)
                        .reduce((sum, c) => sum + c.points, 0)}{" "}
                      {credits
                        .filter((c) => !c.revoked_at)
                        .reduce((sum, c) => sum + c.points, 0) === 1
                        ? "point"
                        : "points"}{" "}
                      recorded in the current point period
                    </p>
                    {credits.map((c) => (
                      <article
                        className={
                          "ledger-row" + (c.revoked_at ? " removed" : "")
                        }
                        key={c.id}
                      >
                        <div
                          className="date-block ledger-date"
                          aria-hidden="true"
                        >
                          <span>
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              timeZone: "America/Chicago",
                            }).format(new Date(c.created_at))}
                          </span>
                          <strong>
                            {new Intl.DateTimeFormat("en-US", {
                              day: "numeric",
                              timeZone: "America/Chicago",
                            }).format(new Date(c.created_at))}
                          </strong>
                        </div>
                        <div className="ledger-entry">
                          <h3>{c.event_name}</h3>
                          <p>
                            {admin ? `${c.society_name} · ` : ""}
                            {labels[c.category]}
                          </p>
                          <small>
                            {when(c.created_at)} CT ·{" "}
                            {c.source === "MANUAL"
                              ? "High Impact credit"
                              : "QR / link check-in"}
                            {c.note && ` · ${c.note}`}
                          </small>
                        </div>
                        <div className="ledger-point-value">
                          {c.revoked_at ? (
                            <Pill>Removed</Pill>
                          ) : (
                            <>
                              <strong>+{c.points}</strong>
                              <span>{c.points === 1 ? "point" : "points"}</span>
                            </>
                          )}
                        </div>
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
                    Event attendance and point awards will appear here with
                    their point values.
                  </Empty>
                )}
              </Panel>
              {(data.historyCount ??
                data.credits.filter((c) => c.cycle_id !== current.id).length) >
                0 && (
                <details
                  className="history-disclosure"
                  onToggle={(e) => {
                    if (
                      e.currentTarget.open &&
                      !archivedCredits.length &&
                      historyMore &&
                      !busy
                    )
                      void loadHistory();
                  }}
                >
                  <summary>Previous attendance records</summary>
                  <div className="record-list">
                    {archivedCredits.map((c) => (
                      <div className="record" key={c.id}>
                        <div>
                          <strong>{c.event_name}</strong>
                          <small>
                            {admin ? c.society_name + " · " : ""}
                            {when(c.created_at)} CT · {labels[c.category]}
                          </small>
                        </div>
                        <Pill>
                          {c.revoked_at ? "Removed" : `+${c.points} archived`}
                        </Pill>
                      </div>
                    ))}
                  </div>
                  {historyMore && (
                    <Button
                      secondary
                      disabled={busy}
                      onClick={() => void loadHistory()}
                    >
                      Load more history
                    </Button>
                  )}
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() => void exportHistory()}
                  >
                    Export all history
                  </Button>
                </details>
              )}
            </>
          )}
          {tab === "applications" &&
            (editingForm !== undefined ? (
              <FormEditor
                key={editorGeneration}
                initial={editingForm}
                busy={busy}
                cancel={() => setEditingForm(undefined)}
                save={async (b) => {
                  if (
                    await run(
                      "admin/forms",
                      b,
                      b.published
                        ? "Application published. Societies can now view and submit."
                        : "Draft saved. Publish it from this list when ready.",
                    )
                  )
                    setEditingForm(undefined);
                }}
              />
            ) : application ? (
              <ApplicationView
                key={application.id + ":" + editorGeneration}
                form={application}
                defaultEmail={defaultConfirmationEmail(
                  data.accounts.find((a) => a.id === data.actor.id)?.contacts ??
                    {},
                )}
                existing={applicationSubmission}
                admin={admin}
                busy={busy}
                cancel={() => setApplication(null)}
                save={async (b) => {
                  const r = await run<Submission>(
                    "submissions/save",
                    b,
                    b.submit ? "Application submitted." : "Draft saved.",
                  );
                  if (r) setApplicationSubmission(r);
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
                            <Pill
                              tone={
                                admin && !f.published
                                  ? "amber"
                                  : closed
                                    ? "neutral"
                                    : "green"
                              }
                            >
                              {admin
                                ? !f.published
                                  ? "Draft"
                                  : closed
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
                            {admin && !f.published && (
                              <p className="draft-hint">
                                Not published · Not accepting new submissions
                                {f.deadline &&
                                Date.parse(f.deadline) <= Date.now()
                                  ? " · Update the deadline before publishing."
                                  : ""}
                              </p>
                            )}
                            <small>
                              {f.kind === "FUNDING"
                                ? "Society funding"
                                : "Cross-collaboration High Impact event"}
                              {f.deadline && ` · Due ${when(f.deadline)} CT`}
                            </small>
                          </div>
                          <div className="actions">
                            {admin && !f.published && (
                              <Button
                                disabled={
                                  busy ||
                                  !!(
                                    f.deadline &&
                                    Date.parse(f.deadline) <= Date.now()
                                  )
                                }
                                aria-label={`Publish ${f.title}`}
                                onClick={() =>
                                  void run(
                                    "admin/form-publication",
                                    {
                                      id: f.id,
                                      version: f.current_version,
                                      published: true,
                                    },
                                    "Application published. Societies can now view and submit.",
                                  )
                                }
                              >
                                Publish application
                              </Button>
                            )}
                            {admin && (
                              <Button
                                secondary
                                onClick={() => void openFormEditor(f)}
                              >
                                Edit form
                              </Button>
                            )}
                            <Button
                              secondary={admin}
                              onClick={() => void openApplication(f)}
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
                  <Empty title="No applications yet">
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
                key={review.id + ":" + editorGeneration}
                retryEmail={async (id) => {
                  const uncertain = review.confirmation_status === "UNCERTAIN";
                  if (
                    uncertain &&
                    !window.confirm(
                      "This email may already have been delivered. Resend and risk a duplicate?",
                    )
                  )
                    return;
                  const result = await run(
                    "admin/email-retry",
                    { id, acknowledgeDuplicate: uncertain },
                    "Application email queued for retry.",
                  );
                  if (result && review) await openReview(review);
                }}
                submission={review}
                busy={busy}
                cancel={() => setReview(null)}
                save={async (b) => {
                  if (await run("admin/review", b, "Review saved."))
                    setReview(null);
                }}
              />
            ) : (
              <Panel title="Submitted applications">
                {data.submissions.filter((s) => s.status !== "DRAFT").length ? (
                  <div className="record-list">
                    {data.submissions
                      .filter((s) => s.status !== "DRAFT")
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
                          <Button secondary onClick={() => void openReview(s)}>
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
              {contactAccount && (
                <ContactEditor
                  key={
                    contactAccount.id +
                    ":" +
                    (contactAccount.contact_revision ?? 1)
                  }
                  account={contactAccount}
                  busy={busy}
                  cancel={() => setContactAccount(null)}
                  save={async (body) => {
                    const r = await run(
                      "accounts/contacts",
                      body,
                      "Society contacts updated.",
                    );
                    if (r) setContactAccount(null);
                    return !!r;
                  }}
                />
              )}
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
                <Field label="Search society accounts">
                  <input
                    type="search"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        void loadCollection("accounts", directorySearch, true);
                    }}
                    placeholder="Search name or username"
                    aria-description="Press Enter to search all society accounts."
                  />
                </Field>
                {data.pagination && (
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() =>
                      void loadCollection("accounts", directorySearch, true)
                    }
                  >
                    Search all societies
                  </Button>
                )}
                {visibleSocieties.length ? (
                  <>
                    <div
                      className="table-wrap directory-table"
                      tabIndex={0}
                      role="region"
                      aria-label="Society account directory"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Society</th>
                            <th scope="col">Account</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleSocieties.map((a) => (
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
                              <td>{societyActions(a)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul className="mobile-society-list">
                      {visibleSocieties.map((a) => (
                        <li key={a.id}>
                          <div className="mobile-society-heading">
                            <h3>{a.display_name}</h3>
                            <Pill tone={a.enabled ? "green" : "neutral"}>
                              {a.enabled
                                ? a.activated
                                  ? "Active"
                                  : "Awaiting setup"
                                : "Disabled"}
                            </Pill>
                          </div>
                          <small>@{a.username}</small>
                          <details>
                            <summary>Contact responses</summary>
                            <ContactInfo contacts={a.contacts} />
                          </details>
                          {societyActions(a)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Empty
                    title={
                      societies.length
                        ? "No matching society accounts"
                        : "No society accounts yet"
                    }
                  >
                    {societies.length
                      ? "Try another name or username."
                      : "Select roster responses below or add a society manually."}
                  </Empty>
                )}
              </Panel>
              <Panel
                title={`Contact roster review · ${rosterGroups.length} loaded societies`}
              >
                <p className="section-intro">
                  Repeated names and known aliases are grouped into one society.
                  Select a society to include all its contact responses, then
                  create one account. Expand Contacts to review the originals.
                </p>
                <Field label="Search contact roster">
                  <input
                    type="search"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        void loadCollection("roster", rosterSearch, true);
                    }}
                    placeholder="Search society name or contact"
                  />
                </Field>
                {data.pagination && (
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() =>
                      void loadCollection("roster", rosterSearch, true)
                    }
                  >
                    Search all contact groups
                  </Button>
                )}
                {refreshing && !data.pagination?.roster ? (
                  <p role="status">Loading contact roster…</p>
                ) : data.roster.length ? (
                  <>
                    <div className="roster-toolbar">
                      <span aria-live="polite">
                        {selectedRoster.length} responses selected ·{" "}
                        {visibleRoster.length} of {rosterGroups.length}{" "}
                        societies shown
                      </span>
                      <Button
                        disabled={!selectedRoster.length}
                        onClick={() => setProvision(true)}
                      >
                        Create account from selection
                      </Button>
                      <button
                        className="text-button"
                        disabled={!selectedRoster.length}
                        onClick={() => setSelectedRoster([])}
                      >
                        Clear selection
                      </button>
                    </div>
                    {!visibleRoster.length && (
                      <Empty title="No matching contact responses">
                        Try another society name or contact email. Your selected
                        responses are preserved.
                      </Empty>
                    )}
                    <div className="roster-list">
                      {visibleRoster.map((group) => {
                        const ids = group.responses.map((r) => r.id);
                        const allSelected = ids.every((id) =>
                          selectedRoster.includes(id),
                        );
                        const partiallySelected =
                          !allSelected &&
                          ids.some((id) => selectedRoster.includes(id));
                        return (
                          <div className="roster-row" key={group.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(node) => {
                                  if (node)
                                    node.indeterminate = partiallySelected;
                                }}
                                onChange={(e) =>
                                  setSelectedRoster((selected) =>
                                    e.target.checked
                                      ? [...new Set([...selected, ...ids])]
                                      : selected.filter(
                                          (id) => !ids.includes(id),
                                        ),
                                  )
                                }
                              />
                              <span>
                                <strong>{group.name}</strong>
                                <small>
                                  {group.responses.length} contact{" "}
                                  {group.responses.length === 1
                                    ? "response"
                                    : "responses"}
                                </small>
                              </span>
                            </label>
                            <details>
                              <summary>Contacts</summary>
                              {group.responses.map((response) => (
                                <div
                                  className="roster-response"
                                  key={response.id}
                                >
                                  <p>
                                    {response.source_timestamp}
                                    {response.name !== group.name &&
                                      ` · Submitted as ${response.name}`}
                                  </p>
                                  <ContactInfo contacts={response.contacts} />
                                </div>
                              ))}
                            </details>
                          </div>
                        );
                      })}
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
                  selected={selectedRoster
                    .map((id) => selectedContacts.current.get(id))
                    .filter((r): r is Candidate => !!r)}
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
              {!admin && data.accounts.find((a) => a.id === data.actor.id) && (
                <ContactEditor
                  key={data.actor.id + ":" + editorGeneration}
                  account={data.accounts.find((a) => a.id === data.actor.id)!}
                  busy={busy}
                  save={async (body) =>
                    !!(await run(
                      "accounts/contacts",
                      body,
                      "Society contacts updated.",
                    ))
                  }
                />
              )}
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
                  <PointReset data={data} busy={busy} run={run} />
                  <Allowlist data={data} busy={busy} run={run} />
                  <details className="panel audit-disclosure">
                    <summary>
                      <span>Recent administrative activity</span>
                      <small>
                        {data.audit.length}{" "}
                        {data.audit.length === 1 ? "entry" : "entries"}
                      </small>
                      <ChevronDown size={18} aria-hidden="true" />
                    </summary>
                    {!data.audit.length && (
                      <p>No administrative activity recorded.</p>
                    )}
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
                  </details>
                </>
              )}
            </>
          )}
          {data.pagination && (
            <div className="collection-pages" aria-label="More records">
              {(tab === "events"
                ? ["events"]
                : tab === "applications"
                  ? ["forms"]
                  : tab === "reviews"
                    ? ["submissions"]
                    : tab === "societies"
                      ? ["accounts", "roster"]
                      : tab === "activity" && admin
                        ? ["accounts", "events"]
                        : tab === "overview" && admin
                          ? ["accounts"]
                          : []
              ).map(
                (kind) =>
                  data.pagination?.[kind]?.hasMore && (
                    <Button
                      key={kind}
                      secondary
                      disabled={busy}
                      onClick={() =>
                        void loadCollection(
                          kind as any,
                          collectionQueries.current[kind]?.search ?? "",
                        )
                      }
                    >
                      {busy
                        ? "Loading…"
                        : `Load more ${kind === "accounts" ? "societies" : kind === "roster" ? "contact groups" : kind}`}
                    </Button>
                  ),
              )}
            </div>
          )}
          <footer className="footer">
            <span>SocietyHub · Built for connection</span>
            <span>Student Engineers’ Council · Texas A&M</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ManualAward({ events, societies, busy, save }: ManualAwardProps) {
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
function CreditCorrection({ id, revoked, busy, save }: CreditCorrectionProps) {
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
function ProvisionForm({ selected, busy, cancel, save }: ProvisionFormProps) {
  const [name, setName] = useState(groupSocietyRoster(selected)[0]?.name ?? ""),
    [username, setUsername] = useState("");
  return (
    <Panel title="Create society account">
      <p className="section-intro">
        {selected.length
          ? `${selected.length} selected contact responses will be attached to this account. Confirm they all belong to the same society.`
          : "Create an account for a society not yet in the contact roster."}
      </p>
      {groupSocietyRoster(selected).map((group) => (
        <p key={group.id}>
          {group.name} · {group.responses.length} contact{" "}
          {group.responses.length === 1 ? "response" : "responses"}
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
function PasswordForm({ busy, save }: PasswordFormProps) {
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
          <PasswordInput
            required
            autoComplete="current-password"
            maxLength={128}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="New password">
            <PasswordInput
              required
              autoComplete="new-password"
              minLength={15}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              required
              autoComplete="new-password"
              minLength={15}
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
function PointReset({ data, busy, run }: PointResetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [failure, setFailure] = useState("");
  const records = data.credits.filter(
    (c) => c.cycle_id === data.pointCycle.id && !c.revoked_at,
  );
  const close = () => dialog.current?.close();
  return (
    <Panel title="Reset society points">
      <p className="section-intro">
        Start a new point period when SEC is ready. All societies return to
        zero; attendance history, events, applications, and existing QR links
        are preserved.
      </p>
      <Button
        secondary
        onClick={() => {
          setConfirmation("");
          setFailure("");
          dialog.current?.showModal();
        }}
      >
        Reset all society points
      </Button>
      <dialog
        ref={dialog}
        className="reset-modal"
        aria-labelledby="reset-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) close();
        }}
      >
        <h2 id="reset-title">Reset all society points?</h2>
        <p>
          This archives {records.length} attendance records worth{" "}
          {records.reduce((sum, c) => sum + c.points, 0)} points. Every society
          starts at zero. Archived records remain available in attendance
          history.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run(
              "admin/reset-points",
              { currentCycleId: data.pointCycle.id, confirmation },
              "Society points reset. Previous attendance is preserved.",
            );
            if (result) close();
            else
              setFailure(
                "Couldn’t confirm the reset. Close and refresh before retrying.",
              );
          }}
        >
          <Field label="Type RESET POINTS to confirm">
            <input
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy}
            />
          </Field>
          {failure && (
            <p role="alert" className="alert error">
              {failure}
            </p>
          )}
          <div className="button-row">
            <Button secondary type="button" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || confirmation !== "RESET POINTS"}
            >
              Reset points
            </Button>
          </div>
        </form>
      </dialog>
    </Panel>
  );
}
function Allowlist({ data, busy, run }: AllowlistProps) {
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
