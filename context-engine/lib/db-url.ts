/// Where the database connection string comes from.
///
/// DATABASE_URL is the name this project documents, but a database provisioned
/// from a host's dashboard injects its credentials under that integration's own
/// name — and Vercel lets you give the integration a custom prefix, so the name
/// is not knowable in advance at all. Hence two passes: the known names first,
/// then any variable whose *value* is a Postgres URL, since a connection string
/// identifies itself.
///
/// Migrations prefer an unpooled endpoint (DDL cannot run through a transaction
/// pooler); Neon calls it DATABASE_URL_UNPOOLED, Vercel POSTGRES_URL_NON_POOLING.

type Env = Record<string, string | undefined>;

const EXACT = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_POSTGRES_URL",
];

const UNPOOLED_EXACT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

const isPostgres = (v: unknown): v is string => typeof v === "string" && /^postgres(ql)?:\/\//.test(v.trim());
const looksUnpooled = (name: string): boolean => /UNPOOLED|NON_POOLING|DIRECT/i.test(name);

function firstOf(env: Env, names: string[]): string | undefined {
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
function scan(env: Env, { unpooled }: { unpooled: boolean }): string | undefined {
  const hits = Object.entries(env)
    .filter((entry): entry is [string, string] => {
      const [name, value] = entry;
      return isPostgres(value) && looksUnpooled(name) === unpooled;
    })
    .sort(([a], [b]) => a.localeCompare(b));
  return hits.length ? hits[0][1].trim() : undefined;
}

export function databaseUrl(env: Env = process.env): string | undefined {
  return firstOf(env, EXACT) ?? scan(env, { unpooled: false }) ?? scan(env, { unpooled: true });
}

export function migrationUrl(env: Env = process.env): string | undefined {
  return firstOf(env, UNPOOLED_EXACT) ?? scan(env, { unpooled: true }) ?? databaseUrl(env);
}
