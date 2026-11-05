---
name: SocietyHub
description: A warm, atmospheric workspace for engineering societies and SEC.
colors:
  ground: "#f4f1eb"
  paper: "#fffdf8"
  ink: "#252321"
  muted: "#69625a"
  line: "#ded9cf"
  tint: "#ece7de"
  maroon: "#6b3037"
  maroon-light: "#54232a"
  on-accent: "#fff9ef"
  input: "#faf7f1"
  input-border: "#8e867b"
  focus: "#9c4c41"
  green: "#28624d"
  green-bg: "#e1eee5"
  amber: "#805014"
  amber-bg: "#f8e9cc"
  red: "#a02f31"
  red-bg: "#f8e5e1"
  chart-prt: "#8c4544"
  chart-standard: "#9b6928"
  chart-impact: "#3f7774"
  skeleton: "#e4dfd5"
  skeleton-shine: "#f5f1e9"
  dark-ground: "#0c0d0e"
  dark-paper: "#171819"
  dark-ink: "#f3ebdd"
  dark-muted: "#bcb4a6"
  dark-line: "#343431"
  dark-tint: "#242524"
  dark-maroon: "#f3ebdd"
  dark-maroon-light: "#ffffff"
  dark-on-accent: "#191a18"
  dark-input: "#111213"
  dark-input-border: "#77776d"
  dark-focus: "#edb785"
  dark-green: "#add9bd"
  dark-green-bg: "#1d382d"
  dark-amber: "#f0ca89"
  dark-amber-bg: "#3b3020"
  dark-red: "#ffb5ab"
  dark-red-bg: "#3d2325"
  dark-chart-prt: "#e5c9a9"
  dark-chart-standard: "#eda963"
  dark-chart-impact: "#8bbcb3"
  dark-skeleton: "#262725"
  dark-skeleton-shine: "#343530"
typography:
  headline:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(2rem, 3.2vw, 3.25rem)"
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-0.035em"
  hero:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "clamp(3rem, 5.3vw, 5.75rem)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  section:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 550
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
  metadata:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.5
  data:
    fontFamily: "\"Instrument Sans Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "76px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  panel: "24px"
  panel-mobile: "20px"
  hero: "30px"
  page-header: "28px"
  input: "14px"
  notice: "16px"
  pill: "999px"
spacing:
  inline: "12px"
  section: "24px"
  panel: "28px"
  desktop-inset: "40px"
  tablet-inset: "28px"
  mobile-inset: "18px"
  field-bottom: "24px"
components:
  button-primary:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.maroon-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
    height: "46px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px 15px"
    height: "48px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "28px"
  navigation-active:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "9px 12px"
    height: "40px"
  pill-positive:
    backgroundColor: "{colors.green-bg}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
  pill-pending:
    backgroundColor: "{colors.amber-bg}"
    textColor: "{colors.amber}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
---
# Design System: SocietyHub

## Overview

**Creative North Star: "Dreamy, grounded connection"**

SocietyHub uses a warm, atmospheric visual world adapted from the supplied SEC Membership Hub Dreamy Redesign. Soft amber, coral, and teal blends give the landing hero and page headers their identity; readable, quieter surfaces carry working records. The authenticated interface is an operating workspace, so tasks, labels, and real data remain more prominent than decoration. The public name is SocietyHub and the supplied SEC logo remains unchanged.

**Key Characteristics:**
- Warm ivory light mode and charcoal/cream dark mode use the same semantic component system.
- A single self-hosted sans-serif family, soft corners, and generous but bounded spacing join public and authenticated surfaces.
- Static atmospheric gradients frame content; forms, tables, and state labels remain explicit.

## Colors

### Primary

The primary action token is muted maroon in light mode and warm cream in dark mode. Its paired on-accent token supplies readable button and selected-navigation text. Amber and teal provide secondary atmosphere and distinguish data categories; they do not replace written meaning.

### Neutral

Light mode pairs warm ivory ground with a slightly brighter paper surface. Dark mode pairs near-black ground with charcoal paper. Ink, muted text, line, tint, input, input-border, and focus tokens each have explicit dark variants in the frontmatter. Borders distinguish working surfaces without resting shadows.

### Semantic

Green denotes completion or success, amber denotes pending work or caution, and red denotes destructive or error states. Each uses a matching background token in both themes. PRT, Standard, and High Impact use the same three chart tokens across charts, category keys, progress bars, and calendar spans. Skeletons use their theme-specific base/highlight pair.

**The Status Rule.** Color reinforces a written status or numeric value; it never substitutes for one.

**The Theme Rule.** Choose semantic tokens rather than literal light colors so forms, tables, calendars, notices, and dialogs remain coherent in both modes.

## Typography

**Website Font:** Instrument Sans Variable, self-hosted through `@fontsource-variable/instrument-sans`, with Segoe UI, Arial, and sans-serif fallbacks. A single family carries orientation, reading, controls, and data; script and serif display faces are intentionally excluded.

Page headlines use a medium weight and tight tracking; section headings use a smaller, slightly firmer weight. Body text and native input text retain the ordinary readable size. Metadata is subordinate in size and tone. Data totals use tabular numerals, with the large readiness percentage in a light weight. Prose keeps its inherited bounded measure; header descriptions are capped at 62ch and empty-state explanations at 58ch.

The login hero has the largest type, in a regular weight, with a short two-line message. Login form headings use 32px on desktop and 28px on mobile. Mobile page headings use 32px; mobile hero headings use 39px. The readiness figure reduces from 76px to 64px on mobile. Buttons use 14px/600, while desktop navigation uses 12px with explicit active state.

Confirmation emails retain email-safe Arial/Helvetica/sans-serif; website font availability is not assumed in email clients.

## Layout

The workspace content and desktop header are capped at 1440px. Desktop content uses 40px horizontal insets, with a separate 76px account/context toolbar. The desktop header combines the SEC logo and wordmark, pill navigation, and sign-out control. At widths from 761px through 1200px, navigation occupies a second full-width row and horizontal insets reduce to 28px. The current account name remains visible in the context toolbar with a full-name title and ellipsis protection.

At 760px and below, the established focus-managed navigation drawer replaces the top navigation; a sticky 68px toolbar carries the drawer control, account context, theme control, and refresh. Mobile content uses 18px side insets and 22px top/bottom padding. Grid sections stack, actions wrap or stack, and tables retain their local horizontal scrolling rather than overflowing the page.

Page headers use a soft theme-specific atmospheric gradient, 38px desktop padding, a 28px radius, and a 190px minimum height. Mobile headers reduce to 26px/24px padding with no forced height. Standard panel spacing is 28px, with most mobile panels using 22px. Dashboard content uses separated rounded surfaces; the readiness panel and weekly activity share a top row, with category composition across the next row. Desktop follow-up sections use 1.15fr/1fr columns with 24px gaps and stack on mobile.

Editors and application-detail panels are centered at a maximum width of 980px; their inner forms can occupy the panel width. Lists, calendars, and directories remain wide. The footer wraps naturally on mobile.

The desktop login is a continuous composition inset 22px from the viewport: a 1.2fr atmospheric story and a minimum-420px/0.8fr form side, joined by complementary 30px outer corners. The story has 40px padding and the form is bounded to 400px. At 761px–1000px, the composition uses equal columns with tighter padding. Mobile uses separate 24px-rounded hero and form panels with 12px outer clearance. The compact hero keeps its headline and a Sign in anchor; capability chips are omitted on mobile. The form follows with its own theme toggle. Login does not autofocus an input and skip the hero.

## Elevation & Depth

Tonal layering, borders, and atmospheric blends carry ordinary depth. Panels and primary-button hover do not use resting shadows. The login story uses a dark readability veil over static gradients; its retained ribbon is a low-opacity, pointer-inert accent. Workspace ribbon pseudo-elements from the former visual world are suppressed. Modal backdrops darken and blur the underlying page; the established modal and mobile-drawer shadows remain functional elevation.

Gradients and ribbon artwork are static. The society greeting remains static. Earned-share bar fill and the completed PRT ring draw remain scoped to their states, and reduced-motion preference disables those animations. Skeleton shimmer also has a static reduced-motion state.

## Shapes

Working panels use the shared 24px corner radius, reducing to 20px on mobile. Page-header and login corners are a little broader. Inputs use soft 14px corners rather than pills; action buttons, navigation, status chips, and the theme switch use full pill silhouettes. Notices and submitted-application receipts use 16px corners. Boundaries use theme line or input-border tokens according to whether the component is structural or interactive.

## Components

### Navigation and account context

Desktop navigation is a bordered pill group with compact destinations, a filled active destination, and a separate sign-out action. The mobile drawer retains its focus protection, Escape/backdrop dismissal, opener restoration, and hidden-when-closed keyboard behavior. Navigation destinations and permissions are unchanged. The context toolbar names the signed-in society or SEC account, then identifies SEC administration or member workspace where space permits.

### Theme switch

A sun/moon button appears on login and in the workspace toolbar. Its accessible label names the destination mode. The initial mode follows `prefers-color-scheme` unless a valid `societyhub-theme` preference exists in local storage. The pre-paint document script sets the theme; system changes are followed only while no explicit preference is stored. Storage changes in another tab update the document theme. A storage failure does not prevent the control from changing the current page. Browser native controls receive the matching `color-scheme`.

### Buttons and fields

Primary actions use paired accent/foreground tokens, 46px minimum height, and 12px/22px padding; login submission uses 50px minimum height. Secondary actions keep a visible input-border outline and transparent surface. Disabled controls have explicit muted surfaces and text. Focus uses a 2px theme-specific outline with a 4px offset.

Text inputs, selects, and textareas use the input surface, ink, and input-border tokens, 48px minimum height, 16px text, and 12px/15px padding. Fields keep 24px bottom spacing and 13px hints. Autofill is reconciled to the current input surface and text. Password fields start hidden and offer a labeled eye button with a pressed state; field IDs and hint associations reach the actual input.

### Working panels and records

Panel titles and actions share a flexible header. Event rows, application rows, attendance entries, and account records use readable hierarchy and local rules inside the themed panel. Empty states retain a concise title and next-step explanation. Search, pagination, revision warnings, notices, and existing unsaved-change protection keep their functional behavior.

### Dashboard visualizations

The SEC readiness percentage uses complete enabled-society counts and explicit PRT follow-up values, with review and setup shortcuts. Weekly activity and category composition show current-period non-revoked points and visible numbers. Society points retain the earned-category ledger and PRT completion ring, with their existing reset-period scoping. No reference sample counts or extra categories are introduced.

### Calendar, QR, and dialogs

Calendar dates, selected/today state, category spans, legends, and selected-day details all use theme tokens. Bars represent event duration; day details label the independent check-in window. Event editing preserves Enabled/Paused radio choices and the clear check-in explanation.

QR/link tools remain in a focus-trapped native dialog with their existing link replacement, copy, and PNG download actions. The actual QR stays black on a white padded surface in both themes. The point-reset dialog retains its required confirmation and historical-record protection. Escape, backdrop dismissal, and opener restoration remain in place.

### Applications and account settings

Application authoring retains separate choice inputs and explicit draft/publish actions. Submitted application answers remain read-only when required, with written delivery/review state and a themed receipt surface. Contact editing, original-contact evidence, stale-save recovery, password changes, and audit disclosures remain available. Operational health is not a visible workspace-settings panel; monitoring continues independently.

### Loading

Branded skeletons follow the theme surfaces. Desktop placeholders use a top navigation arrangement; mobile omits the placeholder side rail. QR loading reserves its image area and exposes a written preparation state. Loading regions retain accessible status text and `aria-busy` rather than exposing decorative placeholder shapes.

## Do's and Don'ts

### Do:
- Do use the semantic theme tokens for every surface, label, boundary, and data category.
- Do preserve the supplied SEC logo, the SocietyHub name, and visible signed-in account context.
- Do keep required labels, written statuses, numeric chart values, focus outlines, and reduced-motion behavior.
- Do constrain editors to a deliberate reading width while leaving calendars and directories room to operate.

### Don't:
- Don’t introduce script or serif display fonts; the user explicitly rejected that direction.
- Don’t copy the reference’s example memberships, point categories, rewards, or dummy counts into product behavior.
- Don’t turn QR artwork into a themed image: it remains black on white in both modes.
- Don’t restore the old white/maroon sidebar world or scatter ribbon fragments across working records.
