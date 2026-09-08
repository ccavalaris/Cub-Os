/**
 * One command from a fresh clone to a running, seeded Club OS.
 *
 *   npm run setup
 *
 * Creates .env from the template if it is missing, generates a real
 * AUTH_SECRET, applies migrations, and seeds the demo club. Safe to re-run —
 * migrations are idempotent and the seed rebuilds the demo club in place.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// ---- .env ------------------------------------------------------------------
if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) fail("No .env and no .env.example to copy from.");
  fs.copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
}

let env = fs.readFileSync(envPath, "utf8");

// A placeholder secret is worse than no secret — it looks configured.
if (/AUTH_SECRET="?(replace-me|)"?\s*$/m.test(env) || !/^AUTH_SECRET=/m.test(env)) {
  const secret = randomBytes(32).toString("base64");
  env = /^AUTH_SECRET=/m.test(env)
    ? env.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`)
    : `${env.trimEnd()}\nAUTH_SECRET="${secret}"\n`;
  fs.writeFileSync(envPath, env);
  console.log("Generated a new AUTH_SECRET");
}

const dbLine = /^DATABASE_URL="?([^"\n]*)"?/m.exec(env);
const dbUrl = dbLine?.[1] ?? "";
if (!dbUrl || dbUrl.includes("user:password@host")) {
  fail(
    "DATABASE_URL in .env is still the template value.\n" +
      "  Point it at a Postgres database, then run `npm run setup` again.\n" +
      "  Supabase: Project Settings → Database → Connection string → URI.",
  );
}

// ---- database --------------------------------------------------------------
console.log("\nApplying migrations…");
try {
  run("npx prisma migrate deploy");
} catch {
  fail(
    "Migrations failed. The usual cause is DATABASE_URL not being reachable.\n" +
      "  Against a Supabase pooler, run migrations on the DIRECT connection (port 5432).",
  );
}

// ---- demo password ---------------------------------------------------------
// A memorable shared password is fine on a laptop. On a hosted database the URL
// can be opened by anyone who has the link, and the seeded addresses are easy to
// guess, so seed a strong one instead unless the operator chose their own.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(dbUrl) || dbUrl.includes("@/");
let demoPassword = process.env.SEED_DEMO_PASSWORD ?? "";
let generatedPassword = false;

if (!demoPassword && !isLocal) {
  demoPassword = randomBytes(12).toString("base64url");
  generatedPassword = true;
}

console.log("\nSeeding the demo club…");
run("npx prisma generate");
execSync("npx tsx prisma/seed.ts", {
  cwd: root,
  stdio: "inherit",
  env: demoPassword ? { ...process.env, SEED_DEMO_PASSWORD: demoPassword } : process.env,
});

if (generatedPassword) {
  console.log(
    "\n" +
      "  ────────────────────────────────────────────────────────────\n" +
      "  This is not a local database, so the staff logins were seeded\n" +
      "  with a generated password rather than the shared demo one:\n\n" +
      `      ${demoPassword}\n\n` +
      "  Write it down — it is not stored anywhere and is not shown\n" +
      "  again. Set SEED_DEMO_PASSWORD yourself to choose your own.\n" +
      "  Also set SHOW_DEMO_LOGINS=false wherever the app is hosted.\n" +
      "  ────────────────────────────────────────────────────────────\n",
  );
}

console.log("\n✓ Ready. Start it with:  npm run dev\n");
