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
  nav-active: "#f5e9ed"
  nav-hover: "#f7f2f3"
  button-text: "#ffffff"
  input-line: "#cec8ca"
  focus: "#8c4658"
  table-header: "#faf9fa"
  pill-neutral: "#f5f4f4"
  event-date: "#f7eef1"
  input-disabled: "#f6f4f5"
  note: "#faf7f8"
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
    fontSize: "44px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.04em"
rounded:
  panel: "14px"
  control: "6px"
  button: "7px"
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
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.maroon}"
    rounded: "{rounded.navigation}"
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

Maroon identifies the brand, active destinations, and action hierarchy. Active navigation and identity avatars use a pale rose fill. Primary action hover uses its own deeper red-brown fill, while inactive navigation hover uses the shared pale rose tint and maroon text.

### Neutral

Ink is the primary reading color; muted text carries descriptions and metadata. White panels, sidebar, and top bar sit on the white ground canvas with line-colored boundaries. Tint supports secondary hover and progress tracks. Table headers use a near-white tone, neutral pills use a light gray fill, date blocks use pale rose, and notes use a subtle rose-white surface. Disabled fields use their pale neutral fill and muted text; placeholders also use muted text.

### Semantic

Green and its pale background indicate positive status and PRT completion. Amber and its pale background identify pending or caution states. Red identifies destructive actions and errors. Keep status labels visible alongside color.

**The Status Rule.** Color reinforces a written status; it never replaces the status label.

## Typography

**Heading Font:** Manrope Variable, with sans-serif fallback.

**Body Font:** DM Sans Variable, with sans-serif fallback.

Both families are self-hosted through `@fontsource-variable` imports in `app/layout.tsx`. Rounded sans-serif forms keep the register approachable while strong headings and compact labels distinguish operational layers.

Page titles use the headline token; mobile page titles are (29px). Section titles use the title token, reduced to (17px) in mobile panel headers. Body copy uses the body token with a paragraph measure of (72ch); working descriptions and records generally use (12–13px). Field labels use the label token; desktop input text is (13px), increasing to (16px) on mobile except the compact semester selector (12px). Point totals use the point-total token, reducing to (34px) on mobile, and tabular numerals. Tables and administrator totals also use tabular numerals. The login story headline uses `clamp(36px, 3.6vw, 56px)` with a maximum width of (480px), keeping its text clear of the ribbon’s broad outer curve.

## Layout

The fixed desktop sidebar is (244px) wide; the main region offsets by the same amount. The content container is capped at (1440px) with desktop insets from the spacing tokens. The top bar is (78px) tall. Panels use the panel spacing token; the recurring panel and grid gap is (24px). The dashboard content grid divides (1.15fr / 1fr), while three point trackers share equal columns.

At (1150px) and below, the sidebar becomes (215px), the main offset matches, content uses tablet insets, and the dashboard grid becomes one column. At (760px) and below, a (260px) navigation drawer replaces the sidebar, the main offset clears, and a sticky (65px) top bar carries the labeled menu control. Content uses mobile insets, panels use (20px 18px), point trackers become stacked rows, and forms become one column. At (1600px) and above, content top padding becomes (52px).

The public navigation destination is Dashboard. SEC’s dashboard prioritizes the oldest five applications awaiting review with direct review actions and a full-queue link, then the earliest five upcoming or ongoing selected-semester events with event-management actions and explicit check-in or manual High Impact award status. It also shows up to five enabled societies without an active PRT credit in that semester and up to five enabled accounts awaiting setup across all semesters, with direct setup-link actions. Headings count the full matching lists and truncation text points to the complete destination. The full society points table remains available in the initially collapsed native disclosure, “All society point totals.” The society dashboard retains category totals, applications, and recent attendance, adding the next three upcoming or ongoing events and a View events link.

Tables scroll within their own container, retain a (650px) minimum width, and show a horizontal-scroll instruction on mobile. Long record names wrap. Login uses two white regions for the story and form on desktop and a compact white brand header above the form on mobile.

## Elevation & Depth

Tonal layers and thin rules carry most depth. Panels remain flat, without resting shadows. A primary button hover adds a small shadow (`0 3px 8px #50000016`); the open mobile drawer uses an edge shadow (`10px 0 40px #28000033`).

Panels appear without an entrance animation. Navigation and button hover transitions take (0.15s); the drawer takes (0.2s). Reduced-motion preference disables CSS animations and transitions.

The user-pinned sign-in foundation is white (#ffffff) across the page, story, form region, and decorative background, retaining the desktop left/right split. Static maroon ribbon artwork uses broad, overlapping fabric curves from the SEC reference, served locally as `public/society-ribbon.svg`. Its source is `https://ragnarok-flame-iota.vercel.app/brand/sign-in-ribbon.svg`; the local adaptation uses a (720 × 900) viewBox with `translate(-250 0) scale(.9 1)` to fit the story region. A white readability veil preserves dark-ink headings and muted body copy; the brand remains maroon. The decoration is a static image, pointer-inert and hidden from assistive technology, with no animation or client rendering loop and no runtime external asset request. The compact mobile white brand header remains the mobile composition. The authenticated workspace continues the same white foundation, pale rules, and muted maroon focus outline. A right-edge mask (`linear-gradient(90deg, #000 82%, transparent 100%)`) softly fades the artwork into the white split instead of ending at a hard cutoff.

## Shapes

Paper panels, semester strips, and the point-tracker group use the panel radius. Buttons, controls, navigation, and pills use the smaller frontmatter radii. Records and tables use horizontal rules rather than individual floating cards. The identity avatar is circular; event date blocks use the navigation radius.

## Components

`public/sec-logo.png` is copied unchanged from Delphi’s `public/sec_favicon.png`. It replaces the prior network icon on sign-in, loading, navigation, and browser icons. The public name is SocietyHub, including page titles and footers. The sidebar wordmark uses Manrope Variable at (21px), weight (750), with a (42px × 42px) logo, (10px) gap, and (6px) horizontal padding. Sign-in retains a single (48px × 48px) logo in the story’s top brand, with a (14px) brand gap; its wordmark is (25px) on desktop and (21px) on mobile. The form column starts directly with its heading, without a duplicated logo. The standalone loading logo remains (48px × 48px). Logos retain their proportions with `object-fit: contain`, do not shrink, and have circular rounding.

Primary and secondary buttons share compact typography (12px, weight 650), a minimum height of (42px), and an explicit disabled state (opacity 0.5 and not-allowed cursor). Secondary buttons use a paper surface and line border; their hover uses tint. Text actions use maroon and underline on hover.

Fields place a persistent label above a white control with the input-line stroke, control radius, and minimum height (43px). Help text sits below the label. Errors and saved/loading messages remain explicit. Keyboard focus uses the focus color as a (3px) outline offset by (4px).

Navigation uses full-width rows on the white sidebar, muted text at rest, and a pale rose active row with maroon text. The sidebar has a thin right border; the brand is maroon. Inactive hover uses tint with maroon text. The active destination exposes `aria-current="page"`. The mobile toggle exposes `aria-expanded` and `aria-controls`; closed navigation is both translated off-screen and hidden with `visibility: hidden`, removing its controls from keyboard navigation. Opening focuses its close button. Escape, close, and destination selection close the drawer and return focus to the toggle. A skip link becomes visible on focus.

Pills carry short written states with positive, pending, maroon, or neutral tones. The white, bordered semester strip presents period context above the point register and repeats the static reference ribbon subtly at the right, sized (220px × 275px), beneath a white-to-translucent-white veil. Its foreground remains clear and readable. Point trackers keep PRT, Standard, and High Impact separate; only PRT shows minimum progress. Lists, applications, and attendance tables use ruled rows and compact metadata.

Application forms add a labeled confirmation-email field using the existing control style, with help text explaining the receipt destination and acceptance of an officer’s personal email. Receipt status is a normal paragraph (13px), with (16px 0 22px) margins and wrapping for long addresses; written messages distinguish queued, sent, and failed delivery while confirming that a failed email leaves the application saved. SEC review offers the existing secondary-button style to retry eligible unsent receipts, disabled while busy. These additions retain the ordinary form and record hierarchy.

Dashboard action rows reuse ruled records and existing primary, secondary, or text actions. Row content allows shrinking with `min-width: 0`, while its direct action does not shrink. At (760px) and below, action rows stack their content and action vertically, align to the start, and use an (8px) gap. The native points-register disclosure summary is maroon, (13px), weight (650), with (12px 0 20px) padding. Repeated direct actions have descriptive accessible names; changing navigation destinations scrolls to the top.

The login combines account setup and password-reset help in one pale rose card (#fcf5f5) with a (1px #ead4d8) border, the input-matching (6px) radius, (18px) padding, and a (32px minmax(0, 1fr)) grid with a (12px) gap. A maroon KeyRound icon (17px) sits in a white circular holder (32px). The bold title and body are (12px); body margins are (7px 0 10px). The “Contact an SEC chair” action is maroon (12px, weight 650), with an ArrowRight icon, (8px) gap, and (36px) minimum height; hover underlines the label. Its mail link targets `society@sec.tamu.edu` with subject “SocietyHub account help.” Story topic rows use ink (13px, weight 500), a (10px) flex gap, and maroon FileText, CalendarDays, and Users icons (17px). Autofilled sign-in inputs retain white fill with a (1000px) inset white shadow, ink text and text fill, and a maroon caret through `:is(:autofill, :-webkit-autofill)`.

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
