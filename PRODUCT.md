# SocietyHub

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vercel and Neon Postgres are required. Implementation choice: Next.js with TypeScript, PostgreSQL, and server-managed sessions. User approved implementation of the plan; exact libraries are implementation choices.

## Users

Texas A&M engineering student organizations (ESOs) share society username/password accounts. SEC chairs administer events, funding, societies, and applications.

## Product Purpose

Give ESOs a live, semester-specific record of attendance and society funding points, and a central place to apply to SEC.

## Capabilities and Constraints

PRT: one point/event and one point minimum/semester. Standard: one point/event, no minimum. High Impact: two points/event, manually awarded by SEC, no minimum. One credit per ESO/event. QR and link check-ins automatically credit PRT and Standard events. Keep semester history. SEC authors application forms and reviews submissions. Initial SEC username/password account has administrative permissions. Google OAuth with an explicit TAMU email whitelist is a future integration. Separate development/production schemas and restricted roles within the existing Neon database. User requirements override Kraken reference behavior.

## Evidence on Hand

Kraken provides reference workflows for check-in, history, form building, drafts, and access control. Contact CSV has 89 responses with repeated names and aliases; review before provisioning. Contact details must stay out of source control.

## Product Principles

- Credit belongs to the ESO, not individual officers.
- A repeat check-in never duplicates points.
- Preserve historical and submitted records.
- Make semester, category, and award source visible.

## Open decisions

Brand details are implementation assumptions: maroon, warm neutral surfaces, restrained typography. Public product name: SocietyHub; Nexus is internal only. SEC logo supplied from Delphi/public/sec_favicon.png. Use SEC-issued activation links for account enrollment and recovery.
