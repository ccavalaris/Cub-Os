// Plain-JS twin of lib/db-url.ts, for scripts/migrate.mjs which runs under bare
// node during the build. Keep the two in step.

const EXACT = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_POSTGRES_URL",
];

const UNPOOLED_EXACT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

const isPostgres = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v.trim());
const looksUnpooled = (name) => /UNPOOLED|NON_POOLING|DIRECT/i.test(name);

function firstOf(env, names) {
  for (const name of names) {
    const value = env[name];
    if (isPostgres(value)) return value.trim();
  }
  return undefined;
}

// Any variable whose *value* is a Postgres URL. This is what makes a
// host-provisioned database work when the integration has been given a custom
// variable-name prefix (GOLF_DATABASE_URL and so on) — the name is unknown in
// advance, but a connection string identifies itself.
function scan(env, { unpooled }) {
  const hits = Object.entries(env)
    .filter(([name, value]) => isPostgres(value) && looksUnpooled(name) === unpooled)
    .sort(([a], [b]) => a.localeCompare(b));
  return hits.length ? hits[0][1].trim() : undefined;
}

export function databaseUrl(env = process.env) {
  return firstOf(env, EXACT) ?? scan(env, { unpooled: false }) ?? scan(env, { unpooled: true });
}

export function migrationUrl(env = process.env) {
  return firstOf(env, UNPOOLED_EXACT) ?? scan(env, { unpooled: true }) ?? databaseUrl(env);
}
