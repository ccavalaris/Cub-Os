# Course Context Engine

An operating dashboard for a golf course Head Professional. Course information
arrives as texts, calls, emails and hallway conversations; this turns those into
one place that knows what is happening and what needs attention.

The bet it makes: a Head Pro should be able to understand their course faster
because the software remembers everything and connects the dots.

## Run it

```bash
npm install
npm run setup     # creates .env, migrates, seeds demo data
npm run dev       # http://localhost:3100
```

`npm run setup` needs a Postgres it can reach. The default `.env.example`
points at a local one; any hosted Postgres connection string (Supabase, Neon)
works the same way.

## What it does

**Command Center** — today's events, what is due, who is waiting on a reply,
and an *Attention needed* list of the things that are actually wrong right now.

**Context Inbox** — the box at the top of the Command Center. Type what
happened in plain language; it comes back as members, an event, an interaction
and a set of tasks, which you correct before anything is saved.

> “John Smith called. He's playing in the Member-Guest with Mike. Wants an
> early tee time and asked if his guest can park near the clubhouse. Need to
> confirm shirt sizes.”

becomes John Smith and Mike Brennan, the Men's Member-Guest, a phone
interaction awaiting a reply, and three tasks — confirm the tee time, confirm
guest parking, confirm shirt sizes — all linked to each other.

**Members** — profiles assembled from that operational context rather than
maintained by hand: recent notes, open tasks, upcoming events, preferences.

**Events** — each event's open items, participants, progress, and the recent
notes from anyone playing in it.

**Tasks** — everything, filtered by open / overdue / complete.

**Ask the Course** — questions answered from the records only.

## The AI, and what happens without a key

Two places use a model: reading a note in the inbox, and answering in Ask the
Course. Both run on Claude when `ANTHROPIC_API_KEY` is set.

**Without a key the app still works.** Note reading falls back to a pattern
reader, and Ask the Course falls back to a ranked search over the records. The
UI says which one answered — *Read by Claude* / *Pattern reader*, *Claude* /
*Record search* — rather than presenting the fallback as AI.

Three things keep answers honest either way:

- **The dashboard's Attention list is computed, not generated.** Every line is
  a fact with rows behind it — a count of overdue tasks, an event inside its
  window with open work. It cannot invent a member who never called, and it
  costs nothing to render.
- **Retrieval runs before the model, and gates it.** When the records contain
  nothing about what was asked, the model is never called at all — so *"I don't
  have that information yet"* is a property of the control flow, not something
  the model has to be trusted to say.
- **Extraction never writes directly.** It proposes; you edit; then it saves.

## Data model

Six tables, deliberately small: `Course`, `Member`, `Event`, `Task`,
`Interaction`, `Context` (plus an `EventParticipant` join).

Two decisions worth knowing:

- **There is no `OVERDUE` status.** Tasks are `OPEN`, `IN_PROGRESS` or
  `COMPLETE`; overdue is derived from the due date at read time, so the badge
  on screen can never disagree with the date beside it.
- **`Context` is the provenance trail.** Every inbox note is stored raw, and
  every record extracted from it points back at that row — which is what lets a
  member profile be built from context instead of typed in.

## Deploying

The app is deploy-ready as it stands: `npm run build` runs `prisma migrate
deploy` before `next build`, so the schema is applied as part of the deploy.

**It can share a database with Club OS.** Both apps define `Member` and `Event`
tables, so this one keeps its own in a Postgres schema named `context_engine`
(the `?schema=` parameter on the connection strings below). Club OS's tables in
`public` are untouched.

On Vercel:

1. **New Project → import the repo.** Set **Root Directory** to
   `context-engine` — without it Vercel builds the Club OS app in the repo root.
2. Give it a database. The least error-prone route is to create one from the
   host's own dashboard (on Vercel: the project's **Storage** tab → **Create
   Database** → Postgres), which injects its own credentials — no connection
   string is copied by hand, and there is no password to know. The app reads
   whichever variable the integration sets (`DATABASE_URL`,
   `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, …; see `lib/db-url.ts`).

   To point at your own database instead, set one environment variable:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `<connection string>?schema=context_engine` |
   | `DIRECT_URL` | Only if `DATABASE_URL` is a pooled connection — see below. |
   | `ANTHROPIC_API_KEY` | Optional. Without it the app runs on its fallbacks. |

   `DIRECT_URL` is only needed when `DATABASE_URL` points at a transaction
   pooler, because DDL cannot run through one. On Supabase that means the
   pooled string (port 6543) in `DATABASE_URL` and the direct string (port
   5432) in `DIRECT_URL`. Using the direct string for `DATABASE_URL` and
   leaving `DIRECT_URL` unset is fine at demo traffic.

3. **Deploy.** Migrations run during the build. Until you seed, the app serves
   a short "nothing here yet" page rather than an error.
4. **Seed the demo data once**, from a machine that can reach the database:

   ```bash
   DATABASE_URL="<direct string>?schema=context_engine" \
   DIRECT_URL="<direct string>?schema=context_engine" \
   npm run seed
   ```

   The seed replaces everything it finds, so it refuses to run against a
   database that already holds data unless you pass `-- --force`.

## Checking it works

```bash
npm run dev              # in one terminal
node scripts/smoke.mjs   # in another
```

Drives a real browser through the whole flow: the note above goes into the
inbox, the extraction is checked and edited, it is saved, and the course is
then asked about it. Also checks that questions the records cannot answer are
refused rather than answered from loosely-matching rows. 31 checks.

## Not built

Tee-time booking, POS, handicaps, accounting, billing, staff scheduling. This
is the context layer, not a club management system.
