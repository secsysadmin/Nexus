---
name: SocietyHub
description: A working society desk with an expressive front door.
colors:
  ground: "#f6f7fa"
  paper: "#ffffff"
  ink: "#20212a"
  muted: "#626574"
  line: "#dfe1e9"
  tint: "#eef0f5"
  maroon: "#6257c5"
  maroon-light: "#4c42ac"
  on-accent: "#ffffff"
  input: "#fff"
  input-border: "#9296a6"
  focus: "#756bd5"
  green: "#28624d"
  green-bg: "#e1eee5"
  amber: "#805014"
  amber-bg: "#f8e9cc"
  red: "#a02f31"
  red-bg: "#f8e5e1"
  chart-prt: "#6257c5"
  chart-standard: "#997023"
  chart-impact: "#547c82"
  accent-soft: "#eeebfc"
  accent-ink: "#6257c5"
  skeleton: "#e4dfd5"
  skeleton-shine: "#f5f1e9"
  dark-ground: "#111217"
  dark-paper: "#1a1c24"
  dark-ink: "#f2f3f8"
  dark-muted: "#aeb2c3"
  dark-line: "#333744"
  dark-tint: "#272b37"
  dark-maroon: "#c8c1ff"
  dark-maroon-light: "#e0dcff"
  dark-on-accent: "#272b37"
  dark-input: "#171922"
  dark-input-border: "#747b91"
  dark-focus: "#b9adff"
  dark-green: "#add9bd"
  dark-green-bg: "#1d382d"
  dark-amber: "#f0ca89"
  dark-amber-bg: "#3b3020"
  dark-red: "#ffb5ab"
  dark-red-bg: "#3d2325"
  dark-chart-prt: "#b5a7fb"
  dark-chart-standard: "#dfbb7b"
  dark-chart-impact: "#8dbbc4"
  dark-accent-soft: "#29283f"
  dark-accent-ink: "#d1c9ff"
  dark-skeleton: "#292d3a"
  dark-skeleton-shine: "#383e4e"
  mark-center: "#d8d3ff"
typography:
  headline:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 46px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(44px, 4.3vw, 64px)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.04em"
  landing-accent:
    fontFamily: "\"Sacramento\", cursive"
    fontSize: "clamp(64px, 6vw, 88px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "0"
  section:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 450
    lineHeight: 1.55
  label:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    letterSpacing: "0"
  metadata:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "11px"
    lineHeight: 1.6
  data:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.035em"
  readiness:
    fontFamily: "\"Manrope Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "66px"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  panel: "18px"
  panel-mobile: "16px"
  landing: "24px"
  icon: "12px"
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

SocietyHub pairs a welcoming public entrance with a calm operating workspace for Texas A&M engineering societies and SEC chairs. The independent SocietyHub identity uses a custom H hub mark, neutral surfaces and violet emphasis. Functional SEC roles, contact routes and service context remain part of the product without supplying its visual identity.

**Key Characteristics:**

- A graphite dark default and pearl light mode share semantic surfaces, controls and data colors.
- Manrope provides clear working hierarchy; Sacramento appears only in the landing headline’s “A shared home.” accent.
- Desktop navigation is persistent, summaries are compact, and charts and records expose real product data.

## Colors

The normative frontmatter contains the exact current semantic colors from `app/dreamy.css` as overridden by `app/dreamy-reference.css`. Unprefixed tokens describe light mode; `dark-` tokens describe dark mode. Components bind to the runtime CSS variables so a theme change updates every surface.

### Primary

`maroon` and `on-accent` are legacy CSS names for the violet action pair: saturated violet on light surfaces and pale lavender on dark surfaces. `maroon-light` is its hover role. `accent-soft` and `accent-ink` provide violet selection, readiness and chart emphasis. These internal aliases do not authorize a maroon accent or SEC visual branding.

### Secondary

`chart-prt`, `chart-standard` and `chart-impact` distinguish the three actual point categories. `green`, `amber` and `red`, paired with their background tokens, reinforce positive, pending and error states. Always include a written status or numeric value.

### Neutral

`ground` is the application canvas, `paper` the working surface, `tint` a secondary fill, and `line` a subtle boundary. `ink` and `muted` carry the reading hierarchy. Inputs use the explicit `input-border`; focus uses `focus`. Loading placeholders use `skeleton` and `skeleton-shine`.

The landing story uses a flat `accent-soft` surface with `ink`, `muted` and `accent-ink` type. The custom H mark uses violet, white strokes and a pale lavender center. QR modules remain black on white in every theme.

## Typography

**Operational family:** self-hosted Manrope Variable, with Segoe UI, Arial and sans-serif fallbacks. Body weight is 450; labels and section titles generally use 650. Paragraphs use 1.65 line-height. Field values remain 16px. Ordinary labels use sentence case and no tracking; the small uppercase workspace label is a localized exception.

**Landing accent:** self-hosted Sacramento 400, exclusively for “A shared home.” in the public landing headline. It is not a page-title, sign-in, navigation or label font. Manrope replaces the prior sans-serif and mono font packages; there is no mono label hierarchy.

### Hierarchy

- **Page heading:** 600, `clamp(30px, 3.3vw, 46px)`, 1.15 line-height, −0.04em tracking. Mobile uses 32px/1.2.
- **Public headline:** 600, `clamp(44px, 4.3vw, 64px)`, 1.14 line-height; its Sacramento accent is `clamp(64px, 6vw, 88px)`/1.12. At 1000px these become 42px and 65px; mobile uses 32px and 50px.
- **Section:** usually 21px/650, −0.025em. Dashboard and insight subheads use 18px/650. Form headings use 650, `clamp(24px, 2.2vw, 30px)`/1.2.
- **Data:** summary totals use 44px/650 with tabular numerals, reducing to 30px on mobile. Readiness uses 66px/550, reducing to 60px on mobile.
- **Labels and metadata:** field labels 13px/650; navigation 13px/550, active 700; supporting record details generally 11–13px. Avoid using delicate weights to carry essential operating instructions.

## Layout

Desktop workspace uses a fixed 232px sidebar with vertical destinations, visible account identity and sign-out at the bottom. The main region offsets by 232px. A 76px paper-surface toolbar carries workspace context and theme controls. Content is centered within a 1400px maximum and padded 32px vertically and 36px horizontally. Page headings sit above a simple divider with supporting copy and an optional action.

Three compact summaries share a single bordered surface, with optional destination controls only when navigation is available. The admin dashboard places a wider activity chart beside readiness, then a full-width category breakdown. Working panels use bounded padding; editors retain a 980px reading width. Event cards use two columns on wide screens, with dates and grouped actions; applications use individual bordered rows and directories use a unified table.

At 1200px content insets become 28px, event cards and society point categories stack, and toolbar breadcrumbs disappear. At 1000px insights and dashboard sections stack. At 760px the sidebar becomes a 272px focus-managed drawer; the account toolbar is sticky and 68px high, content padding becomes 26px 18px, and panels use 20px inset. Keep all mobile actions reachable.

The landing is bounded at 1440px with 36px horizontal padding. Beneath a 104px brand/navigation header, one asymmetric stage uses `minmax(0, 1.22fr) minmax(0, 1fr)` with a 16px gap. A flat violet-tinted story surface and the complete sign-in form sit side by side; the form is bounded at 390px. The story has a 680px desktop minimum height and 48px inset, with its headline above three compact capability rows: events/check-in, funding/applications and collaboration. Context sits inside the same surface; there is no separate feature-card section below it.

At 1000px the columns equalize. At 760px the short headline and sign-in stack with 16px outer padding; capability rows and context are hidden to prioritize sign-in in the first screen. Activation and check-in use a focused form layout without landing capabilities.

## Elevation & Depth

Working surfaces are primarily flat: semantic fills, thin borders and spacing establish hierarchy. Ordinary panels and primary buttons have no resting shadows. Dialog elevation and the mobile drawer retain their functional depth. The landing story is flat, without artwork, texture, ribbons, gradient overlays or decorative animation. The custom brand mark is SVG; there are no new raster assets.

Focus uses a 2px semantic outline with 4px offset; summary destination overlays draw focus inward. Respect reduced-motion preferences by disabling animation and transitions, including the drawer’s 180ms ease transition and loading shimmer. Chart selection communicates state with selected controls and written totals, without relying on motion.

## Shapes

Working panels use 18px corners, reduced to 16px on mobile. Buttons, fields, icon controls and navigation destinations use 10px corners. Status chips remain pills. Landing story and sign-in surfaces use 24px corners, reduced to 22px on mobile. The directory table uses 14px corners; brand and capability icons use 12px corners; compact charts and progress bars have restrained small radii. Thin separators join related summaries and rows without producing nested, equal-weight boxes.

## Components

### Buttons and inputs

Primary buttons pair `maroon` with `on-accent`, use 11px 18px padding and a 44px minimum height; hover uses `maroon-light`. Secondary actions use `paper`, `ink` and a `line` border, strengthening to `input-border` on hover. Disabled controls use `tint` and `muted`. Text actions use stronger 13px Manrope. Inputs use `input`, a 1px `input-border`, 12px 15px padding and a 48px minimum height. Labels remain explicit; password visibility is opt-in and hidden by default.

### Navigation and summaries

Sidebar destinations have 44px minimum height and 12px padding. Active destinations use violet `accent-soft`, `accent-ink` and weight 700; inactive hover uses `tint` and `ink`. Summary cells show real counts and context. A summary receives a full-cell destination button only when its `onSelect` callback exists, with an accessible destination label and visible focus.

### Activity, readiness and category bars

The weekly activity chart summarizes eight weeks of current-period, nonremoved awards. Keyboard-operable week buttons expose selected state, update a polite live summary of points and attendance records, and offer a return to all eight weeks. SVG title text describes each weekly value. Empty data remains truthful.

Readiness is the percentage of active societies meeting the PRT minimum, with written counts, an accessible progress element and links to society/review work. Category bars show each category’s share of earned points. Society PRT progress has a one-point minimum; Standard and High Impact have no minimum, so their bars describe earned share rather than invented goals. Never import sample memberships, rewards or dummy counts from visual references.

### Working records and theme behavior

Events, calendars, applications, contacts, receipt states, dialogs and skeletons use the same semantic theme system. Dark is the unsaved default. Explicit light/dark choice persists in browser storage under `societyhub-theme` and applies before paint. Storage failure preserves the active usable theme and reports that the preference could not be saved; no server-side theme preference is introduced.

Server ownership and role checks, chair-controlled setup/recovery, one-time links, point resets and history, check-in windows, one credit per ESO/event, draft/publish/review workflows and durable notification recovery remain product constraints. QR artwork stays black on white. Operational-health monitoring does not return to workspace settings. `PRODUCT.md` remains the product/security authority; visual samples never change its rules.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens for surfaces, boundaries, actions and data categories in both themes.
- **Do** use Manrope weight and scale to distinguish headings, labels, totals and metadata.
- **Do** preserve SocietyHub, its custom H mark, visible account context, written statuses, accessible data values and keyboard focus.
- **Do** keep sign-in immediately available beside the compact landing story and working pages focused on the next task.
- **Do** use real data and explicit empty states, including zero societies or zero awards.

### Don't:

- **Don't** extend Sacramento beyond the landing “A shared home.” accent or restore mono label hierarchy.
- **Don't** reinstate oversized marketing posters, embedded capsule navigation or giant handwritten titles on task pages.
- **Don't** add a separate marketing preamble or feature-card section before sign-in.
- **Don't** restore ribbon motifs, grain textures, decorative gradient loops, maroon accents or SEC visual branding.
- **Don't** fabricate product goals, categories, personal data or capabilities to resemble a visual reference.
