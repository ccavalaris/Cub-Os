import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./db-url";

/// The connection string is resolved in code rather than left to the schema's
/// env("DATABASE_URL"), so a database provisioned from a host's dashboard works
/// under whichever variable name that host injects. See lib/db-url.ts.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const url = databaseUrl();
  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
