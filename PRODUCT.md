# SocietyHub

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vercel and Neon Postgres are required. Implementation choice: Next.js with TypeScript, PostgreSQL, and server-managed sessions. User approved implementation of the plan; exact libraries are implementation choices.

## Users

Texas A&M engineering student organizations (ESOs) share society username/password accounts. SEC chairs administer events, funding, societies, and applications.

## Product Purpose

Give ESOs a live record of attendance and society funding points, and a central place to apply to SEC.

## Capabilities and Constraints

PRT: one point/event and one point minimum between manual SEC point resets. Standard: one point/event, no minimum. High Impact: two points/event, manually awarded by SEC, no minimum. One credit per ESO/event. QR and link check-ins automatically credit PRT and Standard events. Chairs manually reset all society totals in Settings & audit using a native confirmation dialog requiring RESET POINTS; there are no visible semester controls/settings or automatic semester gating. Reset preserves prior attendance history, events, forms, applications, and existing QR links. Previous attendance remains accessible in a disclosure with an all-history CSV export. Event check-in can be closed and reopened; an expired window is edited before reopening while retaining the existing QR. SEC authors application forms and reviews submissions. Initial SEC username/password account has administrative permissions. Google OAuth with an explicit TAMU email whitelist is a future integration. Separate development/production schemas and restricted roles within the existing Neon database. User requirements override Kraken reference behavior.

## Evidence on Hand

Kraken provides reference workflows for check-in, history, form building, drafts, and access control. Contact CSV has 89 responses with repeated names and aliases; review before provisioning. Contact details must stay out of source control.

## Product Principles

- Credit belongs to the ESO, not individual officers.
- A repeat check-in never duplicates points.
- Preserve historical and submitted records.
- Make the current point period, category, and award source visible.

## Open decisions

Brand details are implementation assumptions: maroon, warm neutral surfaces, restrained typography. Public product name: SocietyHub; Nexus is internal only. SEC logo supplied from Delphi/public/sec_favicon.png. Use SEC-issued activation links for account enrollment and recovery.

## Application receipts and login motion

Application submission and resubmission send a confirmation receipt to an address chosen by the submitting officer, prefilled from the latest valid imported society contact when possible. Drafts send nothing. SEC can inspect and retry failed delivery. Outbound email is enabled only in production. The login’s left panel uses flowing maroon ribbons inspired by the user’s Stripe reference, with reduced-motion and non-WebGL fallbacks.
