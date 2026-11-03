---
name: SocietyHub
description: An editorial society register for point records and SEC administration.
colors:
  maroon: "#500000"
  button-hover: "#712727"
  ink: "#211d20"
  muted: "#625b60"
  ground: "#ffffff"
  paper: "#ffffff"
  line: "#e5e2df"
  tint: "#f7f2f3"
  green: "#265c43"
  green-bg: "#eaf3ed"
  amber: "#795310"
  amber-bg: "#fbf0d5"
  red: "#962b29"
  nav-text: "#625b60"
  rose: "#f5e9ed"
  nav-hover: "#f7f2f3"
  button-text: "#ffffff"
  input-line: "#9c9094"
  focus: "#8c4658"
  table-header: "#faf9fa"
  pill-neutral: "#f5f4f4"
  event-date: "#f7eef1"
  input-disabled: "#f6f4f5"
  note: "#faf7f8"
  chart-standard: "#a64b64"
  chart-high-impact: "#5f6682"
  qr-black: "#000000"
  skeleton-base: "#eee9eb"
  skeleton-highlight: "#f8f5f6"
typography:
  headline:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "clamp(2.25rem, 3.6vw, 3.5rem)"
    fontWeight: 760
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "1.375rem"
    fontWeight: 680
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  item:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "1.0625rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  body:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
  metadata:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "0.8125rem"
    lineHeight: 1.6
  point-total:
    fontFamily: '"Geist Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "32px"
    fontWeight: 750
    lineHeight: 1.2
rounded:
  panel: "14px"
  control: "6px"
  button: "6px"
  navigation: "8px"
  pill: "5px"
spacing:
  inline: "10px"
  field-gap: "7px"
  grid: "24px"
  panel: "26px"
  desktop-inset: "42px"
  tablet-inset: "25px"
  mobile-inset: "18px"
components:
  button-primary:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "26px"
  navigation-active:
    backgroundColor: "transparent"
    textColor: "{colors.maroon}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  pill-positive:
    backgroundColor: "{colors.green-bg}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
---

# Design System: SocietyHub

## Overview

**Creative North Star: "Editorial society register"**

White surfaces, maroon identity and actions, calm headings, and ruled records give societies and SEC a shared operating workspace. Readable records, explicit status, and efficient forms set the visual density. The public name is SocietyHub. Use the existing SEC circular logo copied unchanged from Delphi/public/sec_favicon.png; Nexus is an internal name only.

**Key Characteristics:**
- Unified white surfaces with maroon identity and pale rose states.
- Compact, readable records with clear hierarchy and tabular totals.
- Restrained motion and explicit interaction states.

## Colors

Maroon anchors identity, active navigation, and primary actions; white unifies the canvas, sidebar, top bar, panels, and point context, with pale neutral rules and rose interaction states. The frontmatter records observed reusable colors from `app/globals.css`.

### Primary

Maroon identifies the brand, active destinations, and action hierarchy. Active navigation uses maroon text with a thin maroon left marker on a transparent row; identity avatars retain the pale rose fill. Primary action hover uses its own deeper red-brown fill, while inactive navigation hover uses the shared pale rose tint and maroon text.

### Neutral

Ink is the primary reading color; muted text carries descriptions and metadata. White panels, sidebar, and top bar sit on the white ground canvas with line-colored boundaries. Tint supports secondary hover and progress tracks. Table headers use a near-white tone, neutral pills use a light gray fill, date blocks use pale rose, and notes use a subtle rose-white surface. Disabled fields use their pale neutral fill and muted text; placeholders also use muted text.

### Semantic

Green and its pale background indicate positive status and PRT completion. Amber and its pale background identify pending or caution states. Red identifies destructive actions and errors. Keep status labels visible alongside color.

**The Status Rule.** Color reinforces a written status; it never replaces the status label.

## Typography

**Website Font:** Geist Variable, with Segoe UI, Arial, and sans-serif fallbacks. The website self-hosts this single family through `@fontsource-variable/geist` in `app/layout.tsx`; hierarchy comes from size, weight, and spacing.

The frontmatter records the role scale: display (36–56px), section (22px), item (17px), body (16px), label (14px), and metadata (13px). General page headings use the headline token. Dashboard desktop titles retain their more-specific `clamp(34px, 3.5vw, 52px)` size and (1.12) line height; mobile page/dashboard headings use `clamp(2rem, 7.5vw, 2.75rem)` with (1.12) line height. Mobile section headings are (20px). Controls use (16px) input text, while buttons/navigation use (14px, weight 600). Descriptive copy is generally (15px / 1.65), bounded to (65–70ch). Component-specific data totals retain tabular numerals: the ledger total (32px; 26px mobile), earned values (24px), and PRT ring value (46px).

The form h1 is the login’s primary heading, using `clamp(1.75rem, 2.5vw, 2rem)` (28–32px), weight (720), line height (1.2), and tracking (-0.035em). Its art panel has no separate headline. Login help uses a (14px) bold title and (13px / 1.65) body. Receipt emails use email-safe Arial/Helvetica/sans-serif rather than relying on the website’s self-hosted font.

## Layout

The fixed desktop sidebar is (244px) wide; the main region offsets by the same amount. The content container is capped at (1440px) with desktop insets from the spacing tokens. The top bar is (78px) tall. Panels use the panel spacing token; the recurring panel and grid gap is (24px). The dashboard content grid divides (1.15fr / 1fr), with a (42px) column gap and no row gap. The society points section pairs an earned-points ledger with a PRT requirement ring in `minmax(0, 2fr) minmax(240px, 1fr)` columns, separated by (44px). The requirement region has a left rule and (36px) left padding. At (1000px) and below, it stacks with a (28px) gap, a top rule, and (24px) top padding.

At (1150px) and below, the sidebar becomes (215px), the main offset matches, content uses tablet insets, and the dashboard grid becomes one column. At (760px) and below, a (260px) navigation drawer replaces the sidebar, the main offset clears, and a sticky (65px) top bar carries the labeled menu control. Content uses mobile insets, panels use (20px 18px), forms become one column, and the points visualization retains its stacked ledger/requirement layout. At (1600px) and above, content top padding becomes (52px).

The public navigation destination is Dashboard. SEC’s dashboard prioritizes the oldest five applications awaiting review with direct review actions and a full-queue link, then the earliest five upcoming or ongoing events with event-management actions and explicit check-in status. It also shows up to five enabled societies without an active PRT credit in the current point period and up to five enabled accounts awaiting setup across all point periods, with direct setup-link actions. Counts beside section headings reflect the full matching lists, and truncation text points to the complete destination. The full society points table remains available in the initially collapsed native disclosure, “All society point totals.” The society dashboard greets its account with “Hello, {display_name}” without an overview subtitle. It retains applications and recent attendance, shows the next three upcoming or ongoing events with a View events link, and replaces the former three-column trackers with the Society points ledger and separate PRT requirement.

Tables scroll within their own container, retain a (650px) minimum width, and show a horizontal-scroll instruction on mobile. Long record names wrap. Login uses equal white columns separated by a thin vertical rule. The left design panel has (48px 56px) padding, its SEC/SocietyHub brand at the top, centered contained artwork, and a short centered description at the bottom (`clamp(12px, 1vw, 14px)`, no width cap, no wrapping). The form column uses (64px clamp(40px, 7vw, 112px)) padding and a (400px) form maximum width. At (760px) and below, art and description are hidden, leaving a compact brand header with (25px 24px) padding and a bottom divider; the form uses (36px 24px) padding and a (440px) maximum width.

## Elevation & Depth

Tonal layers and thin rules carry most depth. Panels remain flat, without resting shadows. A primary button hover adds a small shadow (`0 3px 8px #50000016`); the open mobile drawer uses an edge shadow (`10px 0 40px #28000033`).

Panels appear without an entrance animation. Navigation and button hover transitions take (0.15s); the drawer takes (0.2s). Reduced-motion preference disables CSS animations and transitions.

The user-pinned sign-in foundation is white (#ffffff), with equal desktop design/form columns. The static maroon artwork retains the SEC reference geometry, served locally as `public/society-ribbon.svg` from `https://ragnarok-flame-iota.vercel.app/brand/sign-in-ribbon.svg`. Its centered framing uses viewBox `570 -80 890 1070` and `xMidYMid meet`, with no artwork transform. The image is contained at opacity (0.88), inset (112px 2% 120px) within the left panel. The SVG’s own soft-ends mask uses edge-fade stops at (0.025) and (0.975), retaining more of the broad ribbon; there is no extra CSS mask, readability veil, or right-edge fade. The decorative image is pointer-inert, hidden from assistive technology, and has no animation, client rendering loop, or runtime external request. The panel contains only its top brand, artwork, and bottom description, “The home for Texas A&M engineering societies and SEC.” Mobile hides the artwork and description, retaining a compact brand header and bottom divider. The authenticated workspace keeps the same white foundation, pale rules, and muted maroon focus outline.

The society greeting’s words are individual inline blocks that fade from opacity (0) to (1) and slide from horizontal offset (-16px) to (0) over (520ms), with `cubic-bezier(0.16, 1, 0.3, 1)` easing. Words stagger by (60ms), capped at (600ms). It plays once per authenticated session and resets on an authentication-required (401) response. Reduced-motion preference disables the greeting animation. The login ribbon remains static; earned-share bars and the completed PRT ring use the scoped draw motion described below.

Earned-share bars scale horizontally from (0) to (1), anchored at the left center, over (460ms) with `cubic-bezier(0.16, 1, 0.3, 1)` easing. The completed PRT ring draws clockwise from the top by changing stroke dash offset from (100) to (0) over (850ms) with `cubic-bezier(0.22, 1, 0.36, 1)` easing. These draw once on mount or when their keyed state changes: bars key society, point period, category value, and total; the ring keys society, point period, and whether the minimum is met. Increasing an already-met PRT total does not replay the ring. Zero bars and an unmet ring have no draw animation. Reduced-motion preference shows the final state immediately, with all numeric values and status text stable throughout.

## Shapes

Operational form panels retain the panel radius. Dashboard sections, including Society points, are flat and separated by rules without enclosing card corners. Buttons, controls, navigation, and pills use the smaller frontmatter radii. Records and tables use horizontal rules rather than individual floating cards. The identity avatar is circular; event date blocks use the navigation radius.

## Components

`public/sec-logo.png` is copied unchanged from Delphi’s `public/sec_favicon.png`. It replaces the prior network icon on sign-in, loading, navigation, and browser icons. The public name is SocietyHub, including page titles and footers. The sidebar wordmark uses Geist Variable at (21px), weight (750), with a (42px × 42px) logo, (10px) gap, and (6px) horizontal padding. Sign-in retains a single (48px × 48px) logo in the story’s top brand, with a (14px) brand gap; its wordmark is (25px) on desktop and (21px) on mobile. The form column starts directly with its heading, without a duplicated logo. Initial workspace and route loading use the branded skeleton described below. Logos retain their proportions with `object-fit: contain`, do not shrink, and have circular rounding.

Primary and secondary buttons share label typography (14px, weight 600), a minimum height of (44px), and an explicit disabled state (pale background, muted text, line border, and not-allowed cursor). Secondary buttons use a paper surface and line border; their hover uses tint. Text actions use maroon and underline on hover.

Fields place a persistent label above a white control with the input-line stroke, control radius, and minimum height (43px). Help text sits below the label. Errors and saved/loading messages remain explicit. Keyboard focus uses the focus color as a (3px) outline offset by (4px).

Navigation uses full-width rows on the white sidebar, muted text at rest, and a transparent active row with maroon text and a (2px) maroon left marker inset (12px) from top and bottom. Active-row corners are (6px). The sidebar has a thin right border; the brand is maroon. Inactive hover uses tint with maroon text. The active destination exposes `aria-current="page"`. The mobile toggle exposes `aria-expanded` and `aria-controls`; closed navigation is both translated off-screen and hidden with `visibility: hidden`, removing its controls from keyboard navigation. Opening focuses its close button and traps Tab within the navigation dialog. Main content becomes inert and a dark backdrop blocks background interaction. Escape, backdrop, close, and destination selection dismiss the drawer and restore toggle focus; page scrolling is locked while open. A skip link becomes visible on focus.

Pills carry short written states with positive, pending, maroon, or neutral tones. An unboxed context row presents the current point-period start and workspace context above the point register; the dashboard has no ribbon decoration. The points breakdown keeps PRT, Standard, and High Impact separate; only PRT shows a one-point point-period minimum status. Lists, applications, and attendance tables use ruled rows and compact metadata.

Application forms add a labeled confirmation-email field using the existing control style, with help text explaining the receipt destination and acceptance of an officer’s personal email or a society email. Receipt status is a normal paragraph (13px), with (16px 0 22px) margins and wrapping for long addresses; written messages distinguish queued, sent, and failed delivery while confirming that a failed email leaves the application saved. SEC review offers the existing secondary-button style to retry eligible unsent receipts, disabled while busy. These additions retain the ordinary form and record hierarchy.

Dashboard action rows reuse ruled records and existing primary, secondary, or text actions. Row content allows shrinking with `min-width: 0`, while its direct action does not shrink. At (760px) and below, action rows stack their content and action vertically, align to the start, and use an (8px) gap. The native points-register disclosure summary is maroon, (13px), weight (650), with (12px 0 20px) padding. Repeated direct actions have descriptive accessible names; changing navigation destinations scrolls to the top.

The login combines account setup and password-reset help in one pale rose card (#fcf5f5) with a (1px #ead4d8) border, the input-matching (6px) radius, (18px) padding, and a (32px minmax(0, 1fr)) grid with a (12px) gap. A maroon KeyRound icon (17px) sits in a white circular holder (32px). The bold title is (14px) and body is (13px / 1.65); body margins are (7px 0 10px). The “Contact an SEC chair” action is maroon (12px, weight 650), with an ArrowRight icon, (8px) gap, and (36px) minimum height; hover underlines the label. Its mail link targets `society@sec.tamu.edu` with subject “SocietyHub account help.” Autofilled sign-in inputs retain white fill with a (1000px) inset white shadow, ink text and text fill, and a maroon caret through `:is(:autofill, :-webkit-autofill)`.

Dashboard composition uses open sections separated by hairlines, with (26px 0) section padding and (24px 0) on mobile. The page headline is `clamp(34px, 3.5vw, 52px)` with (1.12) line height and (-0.04em) tracking, with mobile title sizing defined by the Typography section. Section headings are (22px), weight (680), reducing to (20px) on mobile; counts sit outside the heading in muted body type (14px, weight 500). Empty sections become one compact status line with a check icon and an optional destination action, using (18px 0) padding, without an extra heading or description. Each section keeps its accessible name and `data-count`. SEC has one primary header action: review the oldest pending application, otherwise manage the earliest upcoming event, otherwise create an event. The collapsed points-register content is also flat. The society greeting has the scoped entrance motion described below; the static login reference artwork remains unchanged.

Society points is a category ledger with Category, Earned, and Minimum columns, an actual earned-total heading, and an Attendance history action. Each ruled category row has a status icon, its point rate, and a (7px) bar showing that category’s share of total earned points, with no implied target. PRT uses maroon, Standard uses chart-standard rose, and High Impact uses chart-high-impact slate. Only PRT has a minimum of one point; Standard and High Impact display None. A separate (180px) ring shows the PRT requirement capped at 0 / 1 or 1 / 1, with (10px) strokes and an explicit requirement status; the ledger and accessible ring label retain the true PRT total even above one. Completed status uses semantic green. A zero total leaves all share bars empty and states that no points are recorded. Totals use only the selected society/current point period’s nonrevoked credits. The display has no timeline, forecast, category-filter controls, or monthly-data disclosure. Its nonzero share bars and completed requirement ring use a brief draw entrance while text and numbers stay constant.

The workspace has no visible semester selector or semester settings and no automatic semester gating. The refresh action remains in the top bar, with the tooltip “Reload the latest workspace data,” a busy state and spinning icon; automatic refresh remains every (30s) while eligible. Reduced motion disables the spin.

Events offer List and Calendar views through native `aria-pressed` buttons in a white, line-bordered (6px) segmented control with a rose active fill. The view toolbar sits outside the content panel. The event month calendar uses Central-time event windows, seven equal columns, and minimum day heights of (110px) desktop and (64px) mobile. Events render as continuous weekly spans in reusable nonoverlapping lanes, labeled once per weekly segment, with continuation arrows at clipped edges. Category fills use maroon, Standard rose, and High Impact slate, with a named legend and readable selected-day details. Date buttons retain roving keyboard focus, arrows and Home/End, a pale rose selected-day state, and a maroon circle for today; month navigation spans the current month and the earliest/latest event windows.

Administrative activity is an admin-only native disclosure, initially collapsed within an operational panel. Its summary uses Geist Variable (18px, weight 650), (17px) on mobile, an activity count, and a maroon chevron that rotates on open; expanded content is separated by (20px). Application authoring explicitly offers Save draft / Publish application, or Save published changes / Unpublish and save draft for published forms. The publication actions follow a top rule, (28px) top margin, and (20px) top padding. Drafts carry an amber label and a written not-published hint; the application list offers a primary Publish application action. Publication changes preserve the existing versioned form and saved submission behavior.

Event check-in QR artwork opens in a centered native dialog with a maximum width of (900px), white surface, panel radius, shadow (`0 24px 80px #1d001a30`), and dark backdrop (#21181b66). Its width is `min(900px, calc(100% - 48px))`, with a maximum height of `calc(100dvh - 48px)`; mobile uses (24px) total viewport clearance. The dialog traps Tab focus, restores the opener and page scrolling on close, and closes by its close control, Escape, or backdrop click. It retains a locally generated (1024px) black-on-white PNG download, sanitized event-derived filename, and current-link-bound image. Link replacement reports success locally with role status and explicitly invalidates earlier links/QRs; failure uses role alert and asks the user to reload before sharing. The event row keeps Edit and QR & link together, with an outlined Enable check-in / Pause check-in action below. On mobile, the action grid uses two equal columns and the check-in action spans the full third row. All actions retain (44px) minimum height; the check-in action uses maroon text and an input-line border rather than a switch graphic.

Choice-based application questions use separate required Choice N input rows rather than a multiline options editor. Rows use a (10px) gap with a flexible field and an icon remove control (44px minimum width, 44px minimum height). The choice group is capped at (640px) with (12px) row gaps and (20px 0 26px) margins. Add choice focuses the new field; removal focuses the preceding available choice. Each choice accepts up to (200) characters, with at least one and at most (30) choices; removal is disabled at one. Select and checkbox questions save their options array, while other question types normalize options to an empty array.

Application content is aligned to a maximum width of (800px). On mobile, the containing panel header and back action stack with a (14px) gap. A submitted society application displays its saved question version and answers in a read-only definition list, with maroon checkmarks for selected multiple-choice values. Question labels are muted (12px, weight 600), answers are (14px) with (1.65) line height, and responses are separated by rules with (20px) vertical padding. A pale rose submission receipt (#fcf5f5), bordered (#ead4d8) and rounded (6px), uses (18px 20px) padding and a (30px) bottom margin; it shows submitted time, confirmation delivery status, and written metadata. Status remains visible above the responses. Drafts and changes-requested submissions retain editable fields when open; other existing read-only conditions still apply.

Attendance history is a ruled ledger with a compact date block, readable event details, and a prominent point amount rather than a tiny badge. A muted (13px) caption reports the active-record count. Rows use (24px) vertical padding and a (20px) gap; the date block is (56px) wide, and the point amount is Geist Variable (30px, weight 700, line height 1.15). Mobile uses (12px) gaps, a (44px) date block, (13px) event titles, and (26px) amounts, keeping the core row together unless correction controls need wrapping. Removed records retain their written state with muted date styling. The former “One society. One record” funding note is absent from the dashboard.

Calendar selected-day details begin with a date block, date heading, and event count. Each event has a clear title (17px, weight 650; 15px mobile) beside its point amount, a category label underneath, clock/location facts, description text bounded to (70ch) at (13px / 1.65), and a distinct written check-in status with a dot. The day heading is (20px), reducing to (17px) on mobile. Event rows use (24px) vertical padding and a (24px) gap; mobile stacks details and actions with a (16px) gap and puts facts on separate lines.

Point periods are controlled manually by SEC. Settings & audit provides Reset all society points, opening a native confirmation dialog that requires the exact text RESET POINTS. The white dialog has a (10px) radius, a line border, width `min(540px, calc(100% - 32px))`, (32px) padding (24px mobile), shadow (`0 24px 80px #211d2030`), and a blurred dark backdrop. It reports archived record/point counts before confirmation; busy controls prevent duplicate submission. Reset begins a new current points period for every society while preserving attendance history, events, forms, submissions, and QR links. Previous attendance records is a native disclosure with a (17px, weight 650) summary and an Export all history CSV action. Closing and reopening event check-in preserves the QR; an expired window opens the event editor so chairs can set a new window.

Form labels expose required state and associate hints with their controls. Check-in completion moves focus to its result heading. Notices and errors wrap long text and have accessible dismissal controls. The society directory offers search, readable labeled contact details with email/phone actions, and a ruled mobile list instead of the desktop table; contact detail columns stack on mobile. Primary buttons, icon actions, checkboxes, and event actions retain (44px) interaction targets.

Application receipt email uses table-based structure and inline styling: a white content surface, pale rose surroundings and footer, maroon identity/action, dark ink, and muted descriptive copy. The SEC image is loaded through the configured HTTPS public site URL, rather than an invented mark. It records application and submission time without semester details, and explains that receipt is not approval or a point award. Arial/Helvetica/sans-serif is the intentional email-client fallback; Geist rendering in Gmail is not assumed.

The account-provisioning roster condenses repeated society names into one ruled row per group, with a canonical name, contact-response count, and one checkbox selecting every original response ID in that group. Grouping uses explicit aliases plus Unicode, case, ampersand, and punctuation normalization; related chapters and parent organizations stay distinct. Search includes the canonical name, original submitted names, and contacts. The native Contacts disclosure preserves each original name, submission date, and contact details, with (16px) vertical response padding and hairlines between responses; original-response metadata is muted (13px), with a (10px) bottom margin. The account-creation summary repeats the condensed canonical name and response count. This presentation groups records without merging or changing database data.

Event editing presents native Enabled / Paused radio choices in a ruled fieldset, with (6px) outlined choice rows and a rose selected fill. Helper text explains that enabled QR/link check-ins accept attendance only between the chosen start/end times, while Paused accepts none. The same full-text status helper is used across lists, calendar details, and QR: Check-in paused when disabled, otherwise Check-in scheduled before start, Check-in ended at or after end, and Check-in open within the window. A future event can be enabled without changing its dates; an expired event opens the editor for a valid current/future window. Existing QR links remain usable. User-facing manual-award explanations are removed; the High Impact award business rule is preserved in PRODUCT.md.

Initial workspace and route loading use a white, branded skeleton shell with ruled navigation, heading, total, and record placeholders. Skeleton fill uses skeleton-base and skeleton-highlight in a (1.6s) shimmer; reduced-motion preference uses the static base fill. Placeholder shapes are hidden from assistive technology, while the main loading region exposes `aria-busy` and a screen-reader status, “Loading your workspace…”. Mobile hides the placeholder sidebar and keeps the compact content shell. QR preparation reserves a (260px × 260px) skeleton with the status “Preparing QR code,” then replaces it with the generated black (#000000) on white (#ffffff) PNG; generation errors keep the sign-in link available.

## Do's and Don'ts

### Do:
- Do use white surfaces, pale rose interaction states, and thin rules for operational records.
- Do retain labels, category names, and tabular totals when showing status or points.
- Do preserve visible keyboard focus and reduced-motion behavior.
- Do keep closed mobile navigation out of keyboard navigation.

### Don't:
- Don't replace written states with color alone.
- Don't apply resting shadows to the flat record panels.
- Don't substitute an invented mark for the supplied SEC logo.

## Operational workflow additions

Event editing presents calendar start/end fields first, followed by an explicitly independent check-in window and a secondary “Use event times for check-in” action. Calendar bars represent event duration; day details separately label check-in availability. Contact management uses the existing panel, field, and button system, with ruled native fieldsets for president and SEC representative, a preferred notification email, and explicit chair-controlled access guidance. Current contacts are distinct from preserved import responses. Paged lists have written Load more actions and server-search buttons. Operational health uses a compact definition list of labeled values, tabular numerals, shared type sizes, and responsive columns. Existing white/maroon surfaces, focus rings, control radii, and reduced-motion behavior are preserved.

## SEC visual overview

The SEC dashboard opens with a pale rose readiness surface paired with ruled weekly activity and category composition charts. Readiness uses full server counts of enabled societies and PRT follow-up, with direct review/setup actions. Eight rolling seven-day buckets show current-period, non-revoked points; category shares use the same complete credit collection. Numeric labels remain visible without hover and empty periods show honest zeros. The existing static ribbon is reused at low opacity behind workspace page headings, kept pointer-inert and out of operational records. Mobile stacks the three summaries; no chart library or new motion is introduced.
