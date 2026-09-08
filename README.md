# Club OS

Operations platform for private golf clubs — tee sheet, lesson book, pro shop
and halfway house POS, member accounts, caddie program, and course conditions,
with real logins and a shared database.

This is the working build of the validated prototypes in
[`reference/`](reference). Those single-file HTML prototypes are the design and
UX spec; this repo is the version a club can actually run on, because the data
lives in Postgres instead of one browser's local storage.

---

## What's in the pilot

Ten modules, each fully wired to the database and gated by role:

| # | Module | What it does |
|---|--------|--------------|
| 00 | Overview | Live club snapshot — rounds, loops, lessons, sales, alerts |
| 01 | Tee Sheet | 48 slots a day, book/edit/block, caddie assignment, any date |
| 02 | Lesson Book | Per-instructor day schedule, charge lessons to accounts |
| 03 | Course Conditions | 18-hole card, pin positions, cart-path flags, grounds log |
| 04 | Caddie Program | Roster and status, assignments read from the tee sheet |
| 05 | Pro Shop Inventory | Stock levels, reorder flags, POS |
| 06 | Halfway House | Same POS engine, separate stock and par levels |
| 07 | Member Directory | Households, dues, month-to-date charges, ledger detail |
| 08 | Event Logistics | Event checklists, task owners, derived attention flags |
| 09 | Tournament Ops | Pairings, flights, live scoring, payouts, comms, play status, rulings, sponsors |

### Not built, and not faked anywhere in the UI

- **SMS broadcast to the field.** Tournament Ops → Field Comms composes and
  keeps a real, timestamped record of what the field was told, and every entry
  is marked `not sent`. Wiring it to phones needs an SMS account and a number
  members recognise; the schema carries a `delivery` state so the log never
  implies a message went out when it did not.
- **GHIN handicap sync** — the handicap is a manual field.
- **Payment processing** — charges and payout credits post to the internal
  ledger only. No money moves.
- **Accounting exports.**

---

## Running it locally

Prerequisites: Node 20+, and a Postgres database you can reach.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy     # or `npx prisma migrate dev` when changing schema
npm run seed                  # demo club, staff logins, today's sheets
npm run dev
```

Open http://localhost:3000. The login screen lists the seeded staff accounts;
they all use the password printed by the seed (`clubos2026` unless you set
`SEED_DEMO_PASSWORD`).

| Role | Email | Sees |
|------|-------|------|
| General Manager | `gm@exmoor.test` | Everything |
| Head Pro | `pro@exmoor.test` | Overview, tee sheet, lessons, course, events, tournament |
| Pro Shop Staff | `shop@exmoor.test` | Overview, lessons, both shops, members |
| Caddie Master | `caddie@exmoor.test` | Overview, tee sheet, caddies, course |

`npm run seed` is idempotent — it tears the demo club down and rebuilds it, so
run it again any time a demo needs a clean sheet.

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | `openssl rand -base64 32` |
| `SEED_DEMO_PASSWORD` | no | Password the seed sets; defaults to `clubos2026` |
| `SHOW_DEMO_LOGINS` | no | Set to `false` to hide the account list on the login page |

---

## Deploying

### Database — Supabase

1. Create a project; copy **Settings → Database → Connection string → URI**.
2. Set `DATABASE_URL` to the **pooled** connection (port 6543) with
   `?pgbouncer=true&connection_limit=1` appended.
3. Run migrations against the **direct** connection (port 5432) once:
   `DATABASE_URL="<direct-url>" npx prisma migrate deploy`
4. Seed the same way if you want demo data in the hosted database.

### App — Vercel

1. Import the repo; the framework preset is Next.js and needs no changes.
2. Add `DATABASE_URL` and `AUTH_SECRET` as environment variables.
3. Deploy. `prisma generate` runs automatically via the `postinstall` script.

Set `SHOW_DEMO_LOGINS=false` on any deployment a member could reach.

---

## How it's built

- **Next.js 15** (App Router) and **React 19**, TypeScript throughout
- **Prisma 6** against **PostgreSQL**
- **Auth.js v5** (NextAuth), credentials + JWT sessions, role on the token
- **Tailwind 4** for layout utilities; the prototype's stylesheet is carried
  over as-is in `app/globals.css` so the design system stays identical

### Design system

Hunter green `#1B3A2F`, parchment `#F3EEE2`, brass `#B8935F`, clay `#A8503D`,
sage `#6E7F64`. Fraunces for display, Inter for UI, IBM Plex Mono for numbers
and timestamps. The three font families are self-hosted in `public/fonts/`,
extracted from the prototype, so there is no runtime dependency on Google Fonts.

The palette is also exposed to Tailwind (`bg-hunter`, `text-brass`, …) via the
`@theme` block at the top of `app/globals.css`.

### Decisions worth knowing

**Money is integer cents.** Every amount is a `*Cents` integer column and is
formatted only at the edge (`lib/money.ts`). No floats touch a price or a
balance.

**Member balances are derived, not stored.** The prototype incremented a
`mtdCharges` number on the member. Here every charge — pro shop, halfway house,
lesson, tournament payout — writes a `MemberCharge` row, and a household's
month-to-date figure is a sum over that ledger. The books can always be
reconciled against the transactions that produced them, and the directory can
show the detail behind any number.

**A payout is a negative charge.** Settling tournament prize money credits the
winner's account through the same ledger every other module writes to, so it
appears on the member directory like any other line and can be reversed. A
payout whose team has no member account is refused rather than silently
skipped.

**Badges state what the data says.** The "needs attention" flag on an event is
computed from its date and its open tasks, and leaderboard positions are
computed with ties (T4, T6). Nothing in the UI asserts a number the underlying
rows do not support.

**Sales are transactional.** Stock decrement, sale, sale lines, and the member
charge all commit together. The decrement is a conditional update, so two
registers ringing the last item cannot both succeed.

**Role checks run on the server.** `lib/session.ts` gates every page and every
server action. Hiding a nav link is presentation; a Caddie Master who types
`/shop` is redirected, and a POS action called directly is rejected before it
touches stock. Global search is scoped the same way, so it can't surface a
module the role can't open.

**Every day is real.** The prototype only let you edit "today" and showed a
synthetic pattern for other dates. Here a date's grid is materialised the first
time someone opens it and persists from then on, so paging forward and booking
next Saturday works.

**Multi-tenant by construction.** Every row hangs off a `Club`. The pilot club's
name, crest, and footer text are database columns, not constants — onboarding a
second club is a seed, not a rewrite.

### Layout

```
app/
  (app)/            authenticated shell — one folder per module
    page.tsx        overview
    tee/ lessons/ course/ caddie/ shop/ halfway/ members/
    events/ tournament/
    pos-actions.ts  shared POS engine for both stock locations
  login/            sign-in
components/         sidebar, page shell, search, shared inventory board
lib/                prisma, auth, session guards, money, dates, read models
prisma/             schema, migrations, seed
reference/          the original prototypes — the UX spec
```

---

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run seed` | Reset and reseed the demo club |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
