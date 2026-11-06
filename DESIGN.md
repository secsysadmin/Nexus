---
name: SocietyHub
description: A working society desk with an expressive front door.
colors:
  ground: "#f6f5f1"
  paper: "#ffffff"
  ink: "#252b2a"
  muted: "#606967"
  line: "#dce1dc"
  tint: "#ebefea"
  maroon: "#722d3d"
  maroon-light: "#55212e"
  on-accent: "#fff9f0"
  input: "#fff"
  input-border: "#a3ada7"
  focus: "#8c4050"
  green: "#28624d"
  green-bg: "#e1eee5"
  amber: "#805014"
  amber-bg: "#f8e9cc"
  red: "#a02f31"
  red-bg: "#f8e5e1"
  chart-prt: "#39695b"
  chart-standard: "#a16a29"
  chart-impact: "#726494"
  accent-soft: "#e6eee8"
  accent-ink: "#39695b"
  skeleton: "#e4dfd5"
  skeleton-shine: "#f5f1e9"
  dark-ground: "#111716"
  dark-paper: "#19211f"
  dark-ink: "#f2f0e7"
  dark-muted: "#adb9b1"
  dark-line: "#35413b"
  dark-tint: "#27332c"
  dark-maroon: "#eedbbb"
  dark-maroon-light: "#fff3dc"
  dark-on-accent: "#27332c"
  dark-input: "#151d19"
  dark-input-border: "#728378"
  dark-focus: "#e1be84"
  dark-green: "#add9bd"
  dark-green-bg: "#1d382d"
  dark-amber: "#f0ca89"
  dark-amber-bg: "#3b3020"
  dark-red: "#ffb5ab"
  dark-red-bg: "#3d2325"
  dark-chart-prt: "#b8d4b3"
  dark-chart-standard: "#e4b375"
  dark-chart-impact: "#b6a8d5"
  dark-accent-soft: "#243b32"
  dark-accent-ink: "#c1daba"
  dark-skeleton: "#26332b"
  dark-skeleton-shine: "#35443a"
  poster-ink: "#fff9ee"
  poster-amber: "#b18a4a"
  poster-teal: "#45897f"
  poster-base: "#273f3f"
typography:
  headline:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 46px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(44px, 4.5vw, 66px)"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.04em"
  landing-accent:
    fontFamily: "\"Sacramento\", cursive"
    fontSize: "clamp(66px, 6.4vw, 94px)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "0"
  section:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 450
    lineHeight: 1.55
  label:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    letterSpacing: "0"
  metadata:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "11px"
    lineHeight: 1.6
  data:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-0.04em"
  readiness:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "66px"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  panel: "18px"
  panel-mobile: "16px"
  landing: "26px"
  landing-mobile: "22px"
  control: "10px"
  compact-card: "14px"
  pill: "999px"
spacing:
  inline: "12px"
  section: "24px"
  panel: "26px"
  desktop-inset: "36px"
  tablet-inset: "28px"
  mobile-inset: "18px"
  field-bottom: "20px"
components:
  button-primary:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.maroon-light}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    height: "48px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "26px"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "44px"
  pill-positive:
    backgroundColor: "{colors.green-bg}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  pill-pending:
    backgroundColor: "{colors.amber-bg}"
    textColor: "{colors.amber}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
---

# Design System: SocietyHub

## Overview

**Creative North Star: “A working society desk with an expressive front door.”**

SocietyHub pairs a welcoming public entrance with a calm operating workspace for Texas A&M engineering societies and SEC chairs. The dreamy reference informs atmosphere and the landing artwork; the completed interface defines composition, typography and density. The public name is SocietyHub, and the supplied SEC logo remains unchanged.

**Key Characteristics:**

- A charcoal and sage dark default and ivory light mode share semantic surfaces, controls and data colors.
- Raleway provides clear working hierarchy; Sacramento appears only in the landing headline’s “A shared home.” accent.
- Desktop navigation is persistent, summaries are compact, and charts and records expose real product data.

## Colors

The normative frontmatter contains the exact current semantic colors from `app/dreamy.css` as overridden by `app/dreamy-reference.css`. Unprefixed tokens describe light mode; `dark-` tokens describe dark mode. Components bind to the runtime CSS variables so a theme change updates every surface.

### Primary

`maroon` and `on-accent` form the primary action pair: maroon on light surfaces, warm cream on dark surfaces. `accent-soft` and `accent-ink` provide sage selection, readiness and chart emphasis. The legacy CSS token name `maroon` remains intentional; it describes an action role across themes.

### Secondary

`chart-prt`, `chart-standard` and `chart-impact` distinguish the three actual point categories. `green`, `amber` and `red`, paired with their background tokens, reinforce positive, pending and error states. Always include a written status or numeric value.

### Neutral

`ground` is the application canvas, `paper` the working surface, `tint` a secondary fill, and `line` a subtle boundary. `ink` and `muted` carry the reading hierarchy. Inputs use the explicit `input-border`; focus uses `focus`. Loading placeholders use `skeleton` and `skeleton-shine`.

The public artwork uses `--poster`: amber and teal radial blends over a deep teal base, with a static grain texture, readability veil and cream foreground. Keep this atmosphere concentrated in the front-door artwork. QR modules remain black on white in every theme.

## Typography

**Operational family:** self-hosted Raleway Variable, with Segoe UI, Arial and sans-serif fallbacks. Body weight is 450; labels and section titles generally use 650. Paragraphs use 1.65 line-height. Field values remain 16px. Ordinary labels use sentence case and no tracking; the small uppercase workspace label is a localized exception.

**Landing accent:** self-hosted Sacramento 400, exclusively for “A shared home.” in the public landing headline. It is not a page-title, sign-in, navigation or label font. IBM Plex Mono remains installed and imported but does not define the active UI label hierarchy.

### Hierarchy

- **Page heading:** 600, `clamp(30px, 3.3vw, 46px)`, 1.15 line-height, −0.04em tracking. Mobile uses 32px/1.2.
- **Public headline:** 550, `clamp(44px, 4.5vw, 66px)`, 1.12 line-height; its Sacramento accent is `clamp(66px, 6.4vw, 94px)`/1.14. At 1000px these become 42px and 65px; mobile uses 32px and 50px.
- **Section:** usually 21px/650, −0.025em. Dashboard and insight subheads use 18px/650. Form headings use 650, `clamp(24px, 2.2vw, 30px)`/1.2.
- **Data:** summary totals use 44px/550 with tabular numerals, reducing to 30px on mobile. Readiness uses 66px/550, reducing to 60px on mobile.
- **Labels and metadata:** field labels 13px/650; navigation 13px/550, active 700; supporting record details generally 11–13px. Avoid using delicate weights to carry essential operating instructions.

## Layout

Desktop workspace uses a fixed 232px sidebar with vertical destinations, visible account identity and sign-out at the bottom. The main region offsets by 232px. A 76px toolbar carries workspace context and theme controls. Content is centered within a 1400px maximum and padded 32px vertically and 36px horizontally. Page headings sit above a simple divider with supporting copy and an optional action.

Three compact summaries share a single bordered surface, with optional destination controls only when navigation is available. The admin dashboard places a wider activity chart beside readiness, then a full-width category breakdown. Working panels use bounded padding; editors retain a 980px reading width. Event cards use two columns on wide screens, with dates and grouped actions; applications use individual bordered rows and directories use a unified table.

At 1200px content insets become 28px, event cards and society point categories stack, and toolbar breadcrumbs disappear. At 1000px insights and dashboard sections stack. At 760px the sidebar becomes a 272px focus-managed drawer; the account toolbar is sticky and 68px high, content padding becomes 26px 18px, and panels use 20px inset. Keep all mobile actions reachable.

The landing is bounded at 1440px with 36px horizontal padding. Beneath a 104px brand/navigation header, its asymmetric grid is `minmax(0, 1.22fr) minmax(0, 1fr)` with a 16px gap. Expressive artwork and the complete sign-in form sit side by side; the form is bounded at 390px. The artwork has a 690px desktop minimum height. Four compact feature columns follow below. At 1000px the columns equalize; at 760px the short artwork and sign-in stack, features use two columns, and outer padding becomes 16px. Activation and check-in use a focused form layout without the long landing content.

## Elevation & Depth

Working surfaces are primarily flat: semantic fills, thin borders and spacing establish hierarchy. Ordinary panels and primary buttons have no resting shadows. Dialog elevation and the mobile drawer retain their functional depth. The landing has a static SVG grain overlay at 0.16 opacity and a readability veil; the existing broad SVG ribbon is decorative, pointer-inert and confined to this artwork. There are no new raster assets.

Focus uses a 2px semantic outline with 4px offset; summary destination overlays draw focus inward. Respect reduced-motion preferences by disabling animation and transitions, including the drawer’s 180ms ease transition and loading shimmer. Chart selection communicates state with selected controls and written totals, without relying on motion.

## Shapes

Working panels use 18px corners, reduced to 16px on mobile. Buttons, fields, icon controls and navigation destinations use 10px corners. Status chips remain pills. Landing artwork and sign-in surfaces use 26px corners, reduced to 22px on mobile. The directory table and landing feature icons use 14px corners; compact charts and progress bars have restrained small radii. Thin separators join related summaries and rows without producing nested, equal-weight boxes.

## Components

### Buttons and inputs

Primary buttons pair `maroon` with `on-accent`, use 11px 18px padding and a 44px minimum height; hover uses `maroon-light`. Secondary actions use `paper`, `ink` and a `line` border, strengthening to `input-border` on hover. Disabled controls use `tint` and `muted`. Text actions use stronger 13px Raleway. Inputs use `input`, a 1px `input-border`, 12px 15px padding and a 48px minimum height. Labels remain explicit; password visibility is opt-in and hidden by default.

### Navigation and summaries

Sidebar destinations have 44px minimum height and 12px padding. Active destinations use `accent-soft`, `accent-ink` and weight 700; inactive hover uses `tint` and `ink`. Summary cells show real counts and context. A summary receives a full-cell destination button only when its `onSelect` callback exists, with an accessible destination label and visible focus.

### Activity, readiness and category bars

The weekly activity chart summarizes eight weeks of current-period, nonremoved awards. Keyboard-operable week buttons expose selected state, update a polite live summary of points and attendance records, and offer a return to all eight weeks. SVG title text describes each weekly value. Empty data remains truthful.

Readiness is the percentage of active societies meeting the PRT minimum, with written counts, an accessible progress element and links to society/review work. Category bars show each category’s share of earned points. Society PRT progress has a one-point minimum; Standard and High Impact have no minimum, so their bars describe earned share rather than invented goals. Never import sample memberships, rewards or dummy counts from visual references.

### Working records and theme behavior

Events, calendars, applications, contacts, receipt states, dialogs and skeletons use the same semantic theme system. Dark is the unsaved default. Explicit light/dark choice persists in browser storage under `societyhub-theme` and applies before paint. Storage failure preserves the active usable theme and reports that the preference could not be saved; no server-side theme preference is introduced.

Server ownership and role checks, chair-controlled setup/recovery, one-time links, point resets and history, check-in windows, one credit per ESO/event, draft/publish/review workflows and durable notification recovery remain product constraints. QR artwork stays black on white. Operational-health monitoring does not return to workspace settings. `PRODUCT.md` remains the product/security authority; visual samples never change its rules.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens for surfaces, boundaries, actions and data categories in both themes.
- **Do** use Raleway weight and scale to distinguish headings, labels, totals and metadata.
- **Do** preserve SocietyHub, the supplied SEC logo, visible account context, written statuses, accessible data values and keyboard focus.
- **Do** keep sign-in immediately available beside the landing artwork and working pages focused on the next task.
- **Do** use real data and explicit empty states, including zero societies or zero awards.

### Don't:

- **Don't** extend Sacramento beyond the landing “A shared home.” accent or restore mono label hierarchy.
- **Don't** reinstate oversized marketing posters, embedded capsule navigation or giant handwritten titles on task pages.
- **Don't** place a marketing preamble or tall feature tiles between arrival and sign-in.
- **Don't** scatter decorative ribbon fragments, gradients or texture across working records.
- **Don't** fabricate product goals, categories, personal data or capabilities to resemble a visual reference.
