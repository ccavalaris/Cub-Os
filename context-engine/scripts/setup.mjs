#!/usr/bin/env node
// One command from a fresh clone to a running app:
//
//   npm install && npm run setup && npm run dev
//
// Creates .env if it is missing, applies migrations, and seeds demo data.

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example.");
}

const env = readFileSync(".env", "utf8");
const url = env.match(/^DATABASE_URL="(.*)"$/m)?.[1] ?? "";
if (!url) {
  console.error("No DATABASE_URL in .env. Add one and run `npm run setup` again.");
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(url);
console.log(`\nUsing ${isLocal ? "a local" : "a hosted"} database.\n`);

try {
  console.log("Applying migrations…");
  run("npx prisma migrate deploy");
} catch {
  console.error(
    "\nMigrations failed — the usual cause is DATABASE_URL not being reachable." +
      (isLocal
        ? "\nIs Postgres running? On Debian/Ubuntu: `service postgresql start`."
        : "\nAgainst a Supabase pooler, run migrations on the DIRECT connection (port 5432)."),
  );
  process.exit(1);
}

console.log("\nSeeding demo data…");
run("npm run seed");

console.log(
  "\nReady. Start it with `npm run dev` — http://localhost:3100" +
    (process.env.ANTHROPIC_API_KEY
      ? "\nANTHROPIC_API_KEY is set: notes and questions run on Claude."
      : "\nNo ANTHROPIC_API_KEY set: the built-in pattern reader and record search" +
        "\nhandle notes and questions. Add a key to .env for Claude-written answers."),
);
