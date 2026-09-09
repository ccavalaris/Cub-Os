// Plain-JS twin of lib/db-url.ts, for scripts/migrate.mjs which runs under bare
// node during the build (before any TypeScript is compiled). Keep the two in
// step — the candidate list is the contract with the hosting integrations.

const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_POSTGRES_URL",
];

export function databaseUrl(env = process.env) {
  for (const name of CANDIDATES) {
    const value = env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export function migrationUrl(env = process.env) {
  return (
    env.DIRECT_URL?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim() ||
    databaseUrl(env)
  );
}
