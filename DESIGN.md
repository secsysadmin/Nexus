---
name: SocietyHub
description: A warm, atmospheric workspace for engineering societies and SEC.
colors:
  ground: "#f 4f 1eb"
  paper: "#fffdf 8"
  ink: "#252321"
  muted: "#69625a"
  line: "#ded 9cf"
  tint: "#ece 7de"
  maroon: "#6b 3037"
  maroon-light: "#54232a"
  on-accent: "#fff 9ef"
  input: "#faf 7f 1"
  input-border: "#8e 867b"
  focus: "#9c 4c 41"
  green: "#28624d"
  green-bg: "#e 1eee 5"
  amber: "#805014"
  amber-bg: "#f 8e 9cc"
  red: "#a 02f 31"
  red-bg: "#f 8e 5e 1"
  chart-prt: "#8c 4544"
  chart-standard: "#9b 6928"
  chart-impact: "#3f 7774"
  skeleton: "#e 4dfd 5"
  skeleton-shine: "#f 5f 1e 9"
  dark-ground: "#0a 0a 0b"
  dark-paper: "#141416"
  dark-ink: "#f 4ebdd"
  dark-muted: "#b 9b 0a 3"
  dark-line: "#303031"
  dark-tint: "#252526"
  dark-maroon: "#f 3ebdd"
  dark-maroon-light: "#ffffff"
  dark-on-accent: "#191a 18"
  dark-input: "#0e0e10"
  dark-input-border: "#77776d"
  dark-focus: "#edb 785"
  dark-green: "#add 9bd"
  dark-green-bg: "#1d 382d"
  dark-amber: "#f 0ca 89"
  dark-amber-bg: "#3b 3020"
  dark-red: "#ffb 5ab"
  dark-red-bg: "#3d 2325"
  dark-chart-prt: "#e 5c 9a 9"
  dark-chart-standard: "#eda 963"
  dark-chart-impact: "#8bbcb 3"
  dark-skeleton: "#262725"
  dark-skeleton-shine: "#343530"
typography:
  headline:
    fontFamily: '"Sacramento", cursive'
    fontSize: "clamp(72px, 7.4vw, 110px)"
    fontWeight: 400
    lineHeight: 1.08
  hero:
    fontFamily: '"Sacramento", cursive'
    fontSize: "138px"
    fontWeight: 400
    lineHeight: 0.88
  section:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "48px"
    fontWeight: 200
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"IBM Plex Mono", monospace'
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.08em"
  metadata:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.5
  data:
    fontFamily: "\"Raleway Variable\", \"Segoe UI\", Arial, sans-serif"
    fontSize: "84px"
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

The user's SEC Membership Hub Dreamy Redesign PDF is the visual authority. Match its composition, rather than applying its colors to the previous interface: full-width grain-textured gradient posters, embedded capsule navigation, handwritten display headings, delicate geometric sans-serif section headings, colorful feature/metric tiles, and compact dark record strips. The public product remains SocietyHub and the supplied SEC logo remains unchanged.

## Colors

Dark is the initial theme without an explicit saved choice: near-black canvas #0a 0a 0b, charcoal surfaces #141416, cream text #f 4ebdd and muted warm text #b 9b 0a 3. A saved light choice uses the existing ivory canvas and dark text. Both modes retain saturated poster backgrounds with cream foregrounds; operational fields/panels follow semantic theme tokens. Amber, teal, rust, mustard and slate blend across the posters. Gradient definitions live in app/dreamy-reference.css, with role tokens inherited from app/dreamy.css.

## Typography

Fonts match the reference and are locally hosted: Sacramento 400 for poster headlines and the sign-in introduction; Raleway Variable for body, controls, thin section headings and large metric numbers; IBM Plex Mono 500 for uppercase navigation, badges and field labels. Desktop poster titles are 72–110px, the public landing title is 138px over three lines, mobile poster titles are 64px, and mobile landing lettering is 96px (82px at the narrowest width). Script lettering never appears in form labels, input values, paragraphs or buttons. Body/input copy remains readable and native browser zoom is preserved.

## Layout

The desktop composition is bounded at 1440px with 20px exterior inset. Workspace posters start at the top and are at least 400px tall. Navigation sits inside the poster 48px from its top; an account/theme toolbar sits beneath navigation. Headline content begins below those controls with 56px side padding. At 761–1200px navigation becomes two rows and title padding increases. At 760px the focus-managed drawer and sticky account toolbar remain, with smaller poster composition below.

The public landing has a full-width poster with brand/navigation, a three-line Student Engineers’ Council title, factual society description and sign-in/explore anchors. Four 400px feature tiles follow an open, thin-weight heading. The real sign-in form sits below the tiles, with direct anchors to it; activation and check-in flows omit the long marketing content. On mobile the feature tiles use two columns and the sign-in panel stacks. No fake members, rewards, leaderboard or other reference-only features are introduced.

## Elevation & Depth

Texture is intentional reference fidelity: a local static SVG fractal-noise tile overlays poster surfaces. There is no animation loop, external image request, or decorative ribbon. Readability veils protect cream text. Functional focus rings, dialogs and navigation behavior remain; ordinary panels use borders without resting shadows.

## Shapes

Posters use 32px corners, record/metric cards 22px, compact rows 18px, controls 14px and capsule buttons/navigation 999px. Mobile radii reduce where needed. Spacing separates major sections by roughly 48–56px and keeps related fields/row actions grouped.

## Components

- Three gradient metric cards use true, current data. SEC sees active society count, pending reviews and upcoming events. Societies see points, attendance count and PRT progress.
- Society category cards mirror the reference tile composition using only the three real categories. PRT has a 1-point minimum. Standard and High Impact have no minimum; their bars explicitly show share of earned points rather than an invented goal.
- Event lists are two-column cards with gradient title bands and grouped actions, stacking on mobile. Applications use independent compact strips directly on the canvas. The directory uses separate rounded row surfaces. Editors retain bounded reading widths.
- Calendar, QR dialogs, receipt states, forms and skeletons follow semantic theme tokens. QR artwork remains black on white. Written status accompanies color.
- The theme switch persists a manual choice locally and applies it before paint. Dark is the unsaved default. Password visibility remains opt-in and defaults to hidden. Storage failures keep the current theme usable and report that the preference could not be saved.
- Server ownership/role checks, point resets/history, one-time links, draft/publish/review flows, durable email recovery and other product rules are unchanged by the visual redesign.

## Do's and Don'ts

Preserve the reference's scale, type contrast, saturated gradients, texture and poster-first layout. Keep forms practical, focus visible, record data real, theme choice persistent and all mobile actions reachable. Do not drift back to a muted split login, small generic headings or nested equal-weight panels. Do not copy sample personal data or fabricate the reference's unrelated product features.
