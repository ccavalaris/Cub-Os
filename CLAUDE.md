# Club OS — Private Club Operations Platform

## What this is
A real, working operations platform for private golf clubs — tee sheet, course
conditions, caddie program, pro shop POS, halfway house inventory, member
directory, event logistics, tournament operations, and a lesson book. This
repo turns a validated HTML/JS prototype into an MVP that can actually be
demoed live and used by one pilot club — not just clicked through.

## Read this first
`/reference/club-os-whitelabel.html` and `/reference/club-os-exmoor.html` are
complete, working single-file prototypes (open them in a browser). They are
the spec. Read them before writing any code. They define:

- The full feature set and exact UX — every module's fields, states, and
  interactions
- The design system — colors, type, spacing (carry it over faithfully, don't
  redesign it)
- Role-based view logic — GM / Head Pro / Pro Shop / Caddie Master each see a
  different subset of tabs (see the `ROLES` object in the prototype's script)

`/reference/Club-OS-30-Day-Build-Plan.docx` has the original week-by-week
technical plan and stack rationale. Treat it as a guide, not gospel — reprioritize
as needed (see "Priorities for this MVP" below).

## Design system (carry over exactly)
Heritage clubhouse aesthetic — NOT generic SaaS blue/shadow style.

- Colors: hunter green `#1B3A2F` (dark `#122720`), parchment `#F3EEE2`, panel
  `#FBF8F1`, ink `#201F1B` / soft ink `#544F45`, brass `#B8935F` /
  `#D9BD8F`, clay `#A8503D`, sage `#6E7F64`, hairline `#DED2B9`
- Type: Fraunces (display/headers), Inter (body/UI), IBM Plex Mono (numbers,
  timestamps, tabular data)
- Signature touches: brass crest-ring monogram, ornamental dividers, subtle
  paper-grain texture background

## Tech stack
- Next.js (App Router) + TypeScript
- PostgreSQL via Supabase (hosted — no local DB to manage)
- Prisma ORM
- Tailwind CSS
- Vercel for hosting/deploy
- Twilio for SMS (tournament text broadcasts)
- Auth: NextAuth or Supabase Auth, role-based (GM, Head Pro, Pro Shop, Caddie
  Master)

## What's different from the prototype — must fix in the real build
- **Persistence.** The prototype saves to the browser's local storage only —
  one device, one browser. The real build needs Postgres so data is shared
  across every user and device at the club.
- **Real auth.** The prototype's role switcher is a dropdown anyone can flip.
  The real build needs actual login tied to a role.
- **Multi-tenant-ready.** The prototype is single-club. Don't hardcode
  "Exmoor" (or any club name) into logic — only into seed/demo data — so a
  second club can be onboarded later without a rewrite.
- **No fabricated integrations.** The prototype's copy implies GHIN,
  payment-terminal, and accounting hooks exist. They don't. Either omit that
  language or mark it "coming soon" — never build fake integration UI that
  looks live.

## Priorities for this MVP
The goal is a working pilot a real club could actually use for a few core
functions — not all ten modules at once. Build **vertically**: pick one
module, make it fully real (auth, database, correct behavior, deployed),
then move to the next. A half-working ten-module app is worse than a
fully-working three-module app when you're standing in front of a GM.

Suggested build order:
1. Auth + roles — login, session, role-gated navigation
2. Member directory — households, dues, MTD charges (every other module
   posts charges here, so it has to exist first)
3. Tee sheet — daily grid, book/edit slots, caddie assignment, day nav
4. Pro shop inventory + POS — sell, charge-to-member, low-stock flags
5. Lesson book — per-instructor schedule, charge lessons to member accounts
6. Halfway house inventory — same POS pattern as pro shop, separate stock
7. Caddie program — roster, status, assignment
8. Course conditions — 18-hole grid, yardages, daily pin position (A/B/C),
   cart-path flags, maintenance log
9. Event logistics — event list with checklist/progress
10. Tournament ops — pairings, flights, live scoring, payouts, text
    broadcasts, weather delays, rulings, sponsor comms

If time is short before a demo, stop after step 4 or 5 and make sure those
are airtight rather than rushing through all ten.

## Non-goals for now
- Payment processor integration (Stripe, etc.) — charges post to an internal
  ledger only, no real money moves yet
- GHIN handicap sync — a manual handicap field is enough for now
- A native mobile app — responsive web is enough; the prototype's mobile
  breakpoints show the target layout

## First task
Read both reference HTML files in full, then propose a Prisma schema that
covers modules 1–4 above (auth/roles, members, tee sheet, pro shop). Show the
schema before writing any application code.
