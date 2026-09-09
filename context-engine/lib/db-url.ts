/// Where the database connection string comes from.
///
/// DATABASE_URL is the one this project documents, but a database provisioned
/// from a host's own dashboard injects its credentials under whatever name that
/// integration uses — Vercel's Postgres integrations set POSTGRES_PRISMA_URL and
/// POSTGRES_URL, Neon sets DATABASE_URL, others differ again. Accepting all of
/// them is what makes "click Create Database, redeploy" actually work with no
/// connection string ever passing through a human's clipboard, which is the
/// whole point of provisioning it there.
///
/// Order matters: an explicitly set DATABASE_URL wins, so pointing the app
/// somewhere else stays a matter of setting one variable.

const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_POSTGRES_URL",
] as const;

export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const name of CANDIDATES) {
    const value = env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

/// For migrations: DDL cannot run through a transaction pooler, so prefer a
/// non-pooling URL when the host provides one alongside the pooled default.
/// Neon calls it DATABASE_URL_UNPOOLED, Vercel's own integration calls it
/// POSTGRES_URL_NON_POOLING.
export function migrationUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    env.DIRECT_URL?.trim() ||
    env.DATABASE_URL_UNPOOLED?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim() ||
    databaseUrl(env)
  );
}
