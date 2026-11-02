---
name: SocietyHub
description: An editorial society register for semester records and SEC administration.
colors:
  maroon: "#500000"
  button-hover: "#712727"
  ink: "#292623"
  muted: "#68645f"
  ground: "#ffffff"
  paper: "#ffffff"
  line: "#e5e2df"
  tint: "#f7f2f3"
  semester: "#ffffff"
  green: "#265c43"
  green-bg: "#eaf3ed"
  amber: "#795310"
  amber-bg: "#fbf0d5"
  red: "#962b29"
  nav-text: "#68645f"
  rose: "#f5e9ed"
  nav-hover: "#f7f2f3"
  button-text: "#ffffff"
  input-line: "#cec8ca"
  focus: "#8c4658"
  table-header: "#faf9fa"
  pill-neutral: "#f5f4f4"
  event-date: "#f7eef1"
  input-disabled: "#f6f4f5"
  note: "#faf7f8"
  chart-standard: "#a64b64"
  chart-high-impact: "#5f6682"
typography:
  headline:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "20px"
    fontWeight: 720
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "12px"
    fontWeight: 600
  point-total:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "54px"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.04em"
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

Maroon anchors identity, active navigation, and primary actions; white unifies the canvas, sidebar, top bar, panels, and semester strip, with pale neutral rules and rose interaction states. The frontmatter records observed reusable colors from `app/globals.css`.

### Primary

Maroon identifies the brand, active destinations, and action hierarchy. Active navigation uses maroon text with a thin maroon left marker on a transparent row; identity avatars retain the pale rose fill. Primary action hover uses its own deeper red-brown fill, while inactive navigation hover uses the shared pale rose tint and maroon text.

### Neutral

Ink is the primary reading color; muted text carries descriptions and metadata. White panels, sidebar, and top bar sit on the white ground canvas with line-colored boundaries. Tint supports secondary hover and progress tracks. Table headers use a near-white tone, neutral pills use a light gray fill, date blocks use pale rose, and notes use a subtle rose-white surface. Disabled fields use their pale neutral fill and muted text; placeholders also use muted text.

### Semantic

Green and its pale background indicate positive status and PRT completion. Amber and its pale background identify pending or caution states. Red identifies destructive actions and errors. Keep status labels visible alongside color.

**The Status Rule.** Color reinforces a written status; it never replaces the status label.

## Typography

**Heading Font:** Manrope Variable, with sans-serif fallback.

**Body Font:** DM Sans Variable, with sans-serif fallback.

Both families are self-hosted through `@fontsource-variable` imports in `app/layout.tsx`. Rounded sans-serif forms keep the register approachable while strong headings and compact labels distinguish operational layers.

Page titles use the headline token; mobile page titles are (29px). Section titles use the title token, reduced to (17px) in mobile panel headers. Body copy uses the body token with a paragraph measure of (72ch); working descriptions and records generally use (12–13px). Field labels use the label token; desktop input text is (13px), increasing to (16px) on mobile except the compact semester selector (12px). The selected chart total uses the point-total token, reducing to (46px) on mobile, with tabular numerals. Category breakdown totals are Manrope Variable (28px, weight 750, line height 1.15). Tables and administrator totals also use tabular numerals. The login story headline uses `clamp(36px, 3.6vw, 56px)` with a maximum width of (480px), keeping its text clear of the ribbon’s broad outer curve.

## Layout

The fixed desktop sidebar is (244px) wide; the main region offsets by the same amount. The content container is capped at (1440px) with desktop insets from the spacing tokens. The top bar is (78px) tall. Panels use the panel spacing token; the recurring panel and grid gap is (24px). The dashboard content grid divides (1.15fr / 1fr), with a (42px) column gap and no row gap. The society points section pairs a chart with a category breakdown in `minmax(0, 1.7fr) minmax(260px, 1fr)` columns, separated by (42px); the breakdown has a left rule and (30px) left padding. At (1150px) and below, this becomes one column with a (28px) gap and no breakdown left rule or inset.

At (1150px) and below, the sidebar becomes (215px), the main offset matches, content uses tablet insets, and the dashboard grid becomes one column. At (760px) and below, a (260px) navigation drawer replaces the sidebar, the main offset clears, and a sticky (65px) top bar carries the labeled menu control. Content uses mobile insets, panels use (20px 18px), forms become one column, and the points visualization retains its stacked chart/breakdown layout. At (1600px) and above, content top padding becomes (52px).

The public navigation destination is Dashboard. SEC’s dashboard prioritizes the oldest five applications awaiting review with direct review actions and a full-queue link, then the earliest five upcoming or ongoing selected-semester events with event-management actions and explicit check-in or manual High Impact award status. It also shows up to five enabled societies without an active PRT credit in that semester and up to five enabled accounts awaiting setup across all semesters, with direct setup-link actions. Counts beside section headings reflect the full matching lists, and truncation text points to the complete destination. The full society points table remains available in the initially collapsed native disclosure, “All society point totals.” The society dashboard greets its account with “Hello {display_name}” and a generic subtitle without repeating the society name. It retains applications and recent attendance, shows the next three upcoming or ongoing events with a View events link, and replaces the former three-column trackers with the Semester points visualization and category breakdown.

Tables scroll within their own container, retain a (650px) minimum width, and show a horizontal-scroll instruction on mobile. Long record names wrap. Login uses two white regions for the story and form on desktop and a compact white brand header above the form on mobile.

## Elevation & Depth

Tonal layers and thin rules carry most depth. Panels remain flat, without resting shadows. A primary button hover adds a small shadow (`0 3px 8px #50000016`); the open mobile drawer uses an edge shadow (`10px 0 40px #28000033`).

Panels appear without an entrance animation. Navigation and button hover transitions take (0.15s); the drawer takes (0.2s). Reduced-motion preference disables CSS animations and transitions.

The user-pinned sign-in foundation is white (#ffffff) across the page, story, form region, and decorative background, retaining the desktop left/right split. Static maroon ribbon artwork uses broad, overlapping fabric curves from the SEC reference, served locally as `public/society-ribbon.svg`. Its source is `https://ragnarok-flame-iota.vercel.app/brand/sign-in-ribbon.svg`; the local adaptation uses a (720 × 900) viewBox with `translate(-250 0) scale(.9 1)` to fit the story region. A white readability veil preserves dark-ink headings and muted body copy; the brand remains maroon. The decoration is a static image, pointer-inert and hidden from assistive technology, with no animation or client rendering loop and no runtime external asset request. The compact mobile white brand header remains the mobile composition. The authenticated workspace continues the same white foundation, pale rules, and muted maroon focus outline. A right-edge mask (`linear-gradient(90deg, #000 82%, transparent 100%)`) softly fades the artwork into the white split instead of ending at a hard cutoff.

## Shapes

Operational form panels retain the panel radius. Dashboard sections, including Semester points, are flat and separated by rules without enclosing card corners. Buttons, controls, navigation, and pills use the smaller frontmatter radii. Records and tables use horizontal rules rather than individual floating cards. The identity avatar is circular; event date blocks use the navigation radius.

## Components

`public/sec-logo.png` is copied unchanged from Delphi’s `public/sec_favicon.png`. It replaces the prior network icon on sign-in, loading, navigation, and browser icons. The public name is SocietyHub, including page titles and footers. The sidebar wordmark uses Manrope Variable at (21px), weight (750), with a (42px × 42px) logo, (10px) gap, and (6px) horizontal padding. Sign-in retains a single (48px × 48px) logo in the story’s top brand, with a (14px) brand gap; its wordmark is (25px) on desktop and (21px) on mobile. The form column starts directly with its heading, without a duplicated logo. The standalone loading logo remains (48px × 48px). Logos retain their proportions with `object-fit: contain`, do not shrink, and have circular rounding.

Primary and secondary buttons share compact typography (12px, weight 650), a minimum height of (42px), and an explicit disabled state (opacity 0.5 and not-allowed cursor). Secondary buttons use a paper surface and line border; their hover uses tint. Text actions use maroon and underline on hover.

Fields place a persistent label above a white control with the input-line stroke, control radius, and minimum height (43px). Help text sits below the label. Errors and saved/loading messages remain explicit. Keyboard focus uses the focus color as a (3px) outline offset by (4px).

Navigation uses full-width rows on the white sidebar, muted text at rest, and a transparent active row with maroon text and a (2px) maroon left marker inset (12px) from top and bottom. Active-row corners are (6px). The sidebar has a thin right border; the brand is maroon. Inactive hover uses tint with maroon text. The active destination exposes `aria-current="page"`. The mobile toggle exposes `aria-expanded` and `aria-controls`; closed navigation is both translated off-screen and hidden with `visibility: hidden`, removing its controls from keyboard navigation. Opening focuses its close button. Escape, close, and destination selection close the drawer and return focus to the toggle. A skip link becomes visible on focus.

Pills carry short written states with positive, pending, maroon, or neutral tones. An unboxed context row presents semester, current/history state, and workspace context above the point register; the dashboard has no ribbon decoration. The points breakdown keeps PRT, Standard, and High Impact separate; only PRT shows a one-point semester-minimum status. Lists, applications, and attendance tables use ruled rows and compact metadata.

Application forms add a labeled confirmation-email field using the existing control style, with help text explaining the receipt destination and acceptance of an officer’s personal email. Receipt status is a normal paragraph (13px), with (16px 0 22px) margins and wrapping for long addresses; written messages distinguish queued, sent, and failed delivery while confirming that a failed email leaves the application saved. SEC review offers the existing secondary-button style to retry eligible unsent receipts, disabled while busy. These additions retain the ordinary form and record hierarchy.

Dashboard action rows reuse ruled records and existing primary, secondary, or text actions. Row content allows shrinking with `min-width: 0`, while its direct action does not shrink. At (760px) and below, action rows stack their content and action vertically, align to the start, and use an (8px) gap. The native points-register disclosure summary is maroon, (13px), weight (650), with (12px 0 20px) padding. Repeated direct actions have descriptive accessible names; changing navigation destinations scrolls to the top.

The login combines account setup and password-reset help in one pale rose card (#fcf5f5) with a (1px #ead4d8) border, the input-matching (6px) radius, (18px) padding, and a (32px minmax(0, 1fr)) grid with a (12px) gap. A maroon KeyRound icon (17px) sits in a white circular holder (32px). The bold title and body are (12px); body margins are (7px 0 10px). The “Contact an SEC chair” action is maroon (12px, weight 650), with an ArrowRight icon, (8px) gap, and (36px) minimum height; hover underlines the label. Its mail link targets `society@sec.tamu.edu` with subject “SocietyHub account help.” Story topic rows use ink (13px, weight 500), a (10px) flex gap, and maroon FileText, CalendarDays, and Users icons (17px). Autofilled sign-in inputs retain white fill with a (1000px) inset white shadow, ink text and text fill, and a maroon caret through `:is(:autofill, :-webkit-autofill)`.

Dashboard composition uses open sections separated by hairlines, with (26px 0) section padding and (24px 0) on mobile. The page headline is `clamp(34px, 3.5vw, 52px)` with (1.12) line height and (-0.04em) tracking, fixed at (34px) on mobile. Section headings are (19px), weight (650), reducing to (18px) on mobile; counts sit outside the heading in muted body type (14px, weight 500). Empty sections become one compact status line with a check icon and an optional destination action, using (18px 0) padding, without an extra heading or description. Each section keeps its accessible name and `data-count`. SEC has one primary header action: review the oldest pending application, otherwise manage the earliest upcoming event, otherwise create an event. The collapsed points-register content is also flat. This dashboard treatment adds no motion; the static login reference artwork remains unchanged.

Semester points uses a static SVG cumulative monthly step-area chart (210px high), with five grid levels from zero to a maximum rounded upward to a multiple of four, never below four. All categories is the initial filter; All and PRT use maroon, Standard uses chart-standard, and High Impact uses chart-high-impact. The selected series has a (3px) stroke and a matching area fade from opacity (0.2) to (0.02); the last plotted month has a dashed marker and maroon month label. Native category and All categories buttons expose `aria-pressed`, updating both chart and the politely announced total. Category rows use a (2px) maroon selection marker and a pale rose hover; only PRT has a minimum status, while other categories retain their point-rate explanation. Zero totals show an explicit “No points recorded yet” overlay. “View monthly data” is a native disclosure with a keyboard-scrollable all-category cumulative table; future values are shown as em dashes, with no future chart path. Data is scoped to the selected semester and signed-in society, excludes revoked credits, and uses the Central-time date recorded; early or late records extend the visible month range. This is recorded history, with no animation or forecast.

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
