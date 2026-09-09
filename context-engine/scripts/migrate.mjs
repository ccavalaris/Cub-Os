#!/usr/bin/env node
// Applies migrations, defaulting DIRECT_URL to DATABASE_URL when it is unset.
//
// Prisma requires `directUrl` to resolve whenever the datasource declares it,
// and does not fall back on its own. Only a pooled setup actually needs the two
// to differ (DDL cannot run through a transaction pooler), so requiring both
// everywhere just turns a one-variable deploy into a two-variable one you can
// get wrong — which is how the first deploy of this app failed.

import { execSync } from "node:child_process";

const env = { ...process.env };

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to migrate against.");
  process.exit(1);
}

if (!env.DIRECT_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
  console.log("DIRECT_URL not set; using DATABASE_URL for migrations.");
}

execSync("prisma migrate deploy", { stdio: "inherit", env });
