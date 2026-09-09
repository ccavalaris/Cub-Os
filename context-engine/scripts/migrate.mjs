#!/usr/bin/env node
// Applies migrations before the build — but never fails the build.
//
// A deploy failing because a connection string is wrong leaves you with a red X
// and no URL, which is the least useful place to discover a typo. So a database
// problem here is reported in plain language and the build continues: you get a
// deployed app that explains the same problem in the browser, where you can
// actually act on it.
//
// Also defaults DIRECT_URL to DATABASE_URL. Prisma requires directUrl to resolve
// whenever the datasource declares it and will not fall back on its own; only a
// pooled setup needs the two to differ.

import { execSync } from "node:child_process";

const env = { ...process.env };

function warn(headline, ...detail) {
  console.log(`\n  ${headline}`);
  for (const line of detail) console.log(`  ${line}`);
  console.log("  Continuing the build — the app will show this on screen.\n");
}

if (!env.DATABASE_URL) {
  warn(
    "DATABASE_URL is not set, so the database schema was not applied.",
    "Add it in your host's environment variables and redeploy.",
  );
  process.exit(0);
}

if (!env.DIRECT_URL) env.DIRECT_URL = env.DATABASE_URL;

try {
  execSync("prisma migrate deploy", { stdio: "inherit", env });
} catch {
  warn(...diagnose(env.DATABASE_URL));
  process.exit(0);
}

/// Turns the common connection failures into something actionable. Prisma's own
/// output is accurate but arrives as a stack trace, and the fix is usually one
/// specific thing about the URL.
function diagnose(url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return [
      "DATABASE_URL could not be parsed as a URL.",
      "A password containing # @ / or : must be percent-encoded",
      "(# is %23, @ is %40, / is %2F, : is %3A).",
    ];
  }

  // Supabase's db.<ref>.supabase.co address resolves over IPv6 only, and most
  // build and serverless environments are IPv4-only — so this one never
  // connects no matter how correct the credentials are.
  if (/^db\..*\.supabase\.co$/.test(host)) {
    return [
      `Could not reach ${host}.`,
      "This is Supabase's DIRECT address, which is IPv6-only, and most hosts",
      "are IPv4-only. Use the Session pooler string instead — in Supabase,",
      "click Connect and choose Session pooler. Its host looks like",
      "aws-0-<region>.pooler.supabase.com and its username carries the project",
      "ref, e.g. postgres.<projectref>.",
    ];
  }

  if (/pooler\.supabase\.com$/.test(host) && url.includes(":6543")) {
    return [
      `Could not run migrations against ${host}:6543.`,
      "Port 6543 is the transaction pooler, which cannot run schema changes.",
      "Use port 5432 on the same host (the Session pooler) for DIRECT_URL.",
    ];
  }

  return [
    `Could not connect to ${host}, or the credentials were rejected.`,
    "Check the password, and that any special characters in it are",
    "percent-encoded (# is %23, @ is %40, / is %2F).",
  ];
}
