---
name: SocietyHub
description: An editorial society register for semester records and SEC administration.
colors:
  maroon: "#500000"
  button-hover: "#712727"
  ink: "#292623"
  muted: "#68645f"
  ground: "#f6f5f1"
  paper: "#ffffff"
  line: "#e1ded7"
  tint: "#eee8df"
  semester: "#ebe5da"
  green: "#265c43"
  green-bg: "#eaf3ed"
  amber: "#795310"
  amber-bg: "#fbf0d5"
  red: "#962b29"
  nav-text: "#e5cdc4"
  nav-active: "#f3e9dc"
  nav-hover: "#6b2828"
  button-text: "#fff8f3"
  input-line: "#c9c4ba"
  focus: "#a75a39"
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

Warm paper surfaces, deep maroon navigation, calm headings, and ruled records give societies and SEC a shared operating workspace. Readable records, explicit status, and efficient forms set the visual density. The public name is SocietyHub. Use the existing SEC circular logo copied unchanged from Delphi/public/sec_favicon.png; Nexus is an internal name only.

**Key Characteristics:**
- Warm neutral surfaces anchored by maroon navigation.
- Compact, readable records with clear hierarchy and tabular totals.
- Restrained motion and explicit interaction states.

## Colors

Maroon anchors navigation and primary actions; warm neutrals separate the canvas, paper, rules, and semester strip. The frontmatter records observed reusable colors from `app/globals.css`.

### Primary

Maroon identifies the persistent navigation and action hierarchy. Active navigation reverses to a warm pale fill. Primary action hover uses its own deeper red-brown fill, while inactive navigation hover uses a separate maroon tint.

### Neutral

Ink is the primary reading color; muted text carries descriptions and metadata. Paper panels sit on the ground canvas with line-colored boundaries. Tint supports secondary hover and progress tracks; the semester surface groups period context.

### Semantic

Green and its pale background indicate positive status and PRT completion. Amber and its pale background identify pending or caution states. Red identifies destructive actions and errors. Keep status labels visible alongside color.

**The Status Rule.** Color reinforces a written status; it never replaces the status label.

## Typography

**Heading Font:** Manrope Variable, with sans-serif fallback.

**Body Font:** DM Sans Variable, with sans-serif fallback.

Both families are self-hosted through `@fontsource-variable` imports in `app/layout.tsx`. Rounded sans-serif forms keep the register approachable while strong headings and compact labels distinguish operational layers.

Page titles use the headline token; mobile page titles are (29px). Section titles use the title token, reduced to (17px) in mobile panel headers. Body copy uses the body token with a paragraph measure of (72ch); working descriptions and records generally use (12–13px). Field labels use the label token; desktop input text is (13px), increasing to (16px) on mobile except the compact semester selector (12px). Point totals use the point-total token, reducing to (34px) on mobile, and tabular numerals. Tables and administrator totals also use tabular numerals.

## Layout

The fixed desktop sidebar is (244px) wide; the main region offsets by the same amount. The content container is capped at (1440px) with desktop insets from the spacing tokens. The top bar is (78px) tall. Panels use the panel spacing token; the recurring panel and grid gap is (24px). The overview content grid divides (1.15fr / 1fr), while three point trackers share equal columns.

At (1150px) and below, the sidebar becomes (215px), the main offset matches, content uses tablet insets, and the overview grid becomes one column. At (760px) and below, a (260px) navigation drawer replaces the sidebar, the main offset clears, and a sticky (65px) top bar carries the labeled menu control. Content uses mobile insets, panels use (20px 18px), point trackers become stacked rows, and forms become one column. At (1600px) and above, content top padding becomes (52px).

Tables scroll within their own container, retain a (650px) minimum width, and show a horizontal-scroll instruction on mobile. Long record names wrap. Login uses a maroon story region beside the form on desktop and a compact brand header above the form on mobile.

## Elevation & Depth

Tonal layers and thin rules carry most depth. Panels remain flat, without resting shadows. A primary button hover adds a small shadow (`0 3px 8px #50000016`); the open mobile drawer uses an edge shadow (`10px 0 40px #28000033`).

Panel entry uses a (0.24s) clip-and-brightness reveal with `cubic-bezier(0.16, 1, 0.3, 1)`. Navigation and button hover transitions take (0.15s); the drawer takes (0.2s). Reduced-motion preference disables animations and transitions.

## Shapes

Paper panels, semester strips, and the point-tracker group use the panel radius. Buttons, controls, navigation, and pills use the smaller frontmatter radii. Records and tables use horizontal rules rather than individual floating cards. The identity avatar is circular; event date blocks use the navigation radius.

## Components

`public/sec-logo.png` is copied unchanged from Delphi’s `public/sec_favicon.png`. It replaces the prior network icon on sign-in, loading, navigation, and browser icons. The public name is SocietyHub, including page titles and footers. The sidebar wordmark uses Manrope Variable at (21px), weight (750), with a (42px × 42px) logo, (10px) gap, and (6px) horizontal padding. Sign-in uses a (48px × 48px) logo and (14px) brand gap; its wordmark is (25px) on desktop and (21px) on mobile. The standalone loading logo is also (48px × 48px). Logos retain their proportions with `object-fit: contain`, do not shrink, and have circular rounding.

Primary and secondary buttons share compact typography (12px, weight 650), a minimum height of (42px), and an explicit disabled state (opacity 0.5 and not-allowed cursor). Secondary buttons use a paper surface and line border; their hover uses tint. Text actions use maroon and underline on hover.

Fields place a persistent label above a white control with the input-line stroke, control radius, and minimum height (43px). Help text sits below the label. Errors and saved/loading messages remain explicit. Keyboard focus uses the focus color as a (3px) outline offset by (4px).

Navigation uses full-width rows on the maroon surface, muted pale text at rest, and a warm pale active row with maroon text. The active destination exposes `aria-current="page"`. The mobile toggle exposes `aria-expanded` and `aria-controls`; closed navigation is both translated off-screen and hidden with `visibility: hidden`, removing its controls from keyboard navigation. Opening focuses its close button. Escape, close, and destination selection close the drawer and return focus to the toggle. A skip link becomes visible on focus.

Pills carry short written states with positive, pending, maroon, or neutral tones. The semester strip presents period context above the point register. Point trackers keep PRT, Standard, and High Impact separate; only PRT shows minimum progress. Lists, applications, and attendance tables use ruled rows and compact metadata.

## Do's and Don'ts

### Do:
- Do use warm paper surfaces and thin rules for operational records.
- Do retain labels, category names, and tabular totals when showing status or points.
- Do preserve visible keyboard focus and reduced-motion behavior.
- Do keep closed mobile navigation out of keyboard navigation.

### Don't:
- Don't replace written states with color alone.
- Don't apply resting shadows to the flat record panels.
- Don't substitute an invented mark for the supplied SEC logo.
