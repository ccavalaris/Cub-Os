import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { databaseUrl } from "./db-url";

/// The MVP runs one course, but nothing is hardcoded to a club name — the
/// course is looked up, not assumed.
///
/// Every state a deployment can be in is a value here rather than an exception,
/// because all of them are reachable in normal use: the build no longer fails on
/// a database problem, so the app is the place those problems get explained.

export type CourseState =
  | { status: "ok"; course: { id: string; name: string } }
  | { status: "empty" }
  | { status: "no-schema" }
  | { status: "no-config" }
  | { status: "unreachable"; detail: string };

export async function courseState(): Promise<CourseState> {
  if (!databaseUrl()) return { status: "no-config" };

  try {
    const course = await prisma.course.findFirst({ orderBy: { createdAt: "asc" } });
    return course ? { status: "ok", course } : { status: "empty" };
  } catch (error) {
    // P2021/P2022: the connection worked but the tables are not there, which
    // means migrations have not run against this database yet.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return { status: "no-schema" };
    }
    return { status: "unreachable", detail: describe(error) };
  }
}

function describe(error: unknown): string {
  const host = hostOf(databaseUrl() ?? "");

  // Prisma does not reliably populate errorCode on initialization errors, so
  // the message is matched too — losing the classification would drop exactly
  // the hint that makes these errors fixable.
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const message = error.message ?? "";
    const is = (code: string, ...phrases: string[]) =>
      error.errorCode === code || phrases.some((p) => message.includes(p));

    if (is("P1000", "Authentication failed", "password authentication failed")) {
      return "The database rejected the username or password. If the password contains # @ / or :, those need percent-encoding in the URL (# is %23, @ is %40, / is %2F).";
    }
    if (is("P1001", "Can't reach database server")) {
      if (/^db\..*\.supabase\.co$/.test(host)) {
        return `Could not reach ${host}. That is Supabase's direct address, which is IPv6-only, and most hosting is IPv4-only. Use the Session pooler string instead — in Supabase, click Connect and choose Session pooler.`;
      }
      return `Could not reach ${host}. Check the host and port in DATABASE_URL, and that the database is running.`;
    }
    if (is("P1003", "does not exist on the database server")) {
      return "Connected, but that database does not exist. Check the database name at the end of the URL.";
    }
  }

  return error instanceof Error ? error.message : "Unknown database error.";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "the database";
  }
}
