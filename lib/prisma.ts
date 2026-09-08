import { PrismaClient } from "@prisma/client";

// Next dev server hot-reloads modules; without a global cache each reload
// would open a fresh connection pool until Postgres refuses new clients.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
