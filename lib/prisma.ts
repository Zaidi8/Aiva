// ─────────────────────────────────────────────────────────────────────────────
// Aiva — Prisma Client Singleton
//
// In development, Next.js hot-reloads modules on every file save. Without
// this singleton, each reload spawns a new PrismaClient and exhausts the
// Postgres connection pool within seconds. The pattern below caches the
// client on globalThis so reloads reuse the same instance.
//
// In production (Vercel serverless), each invocation is a fresh process,
// so the cache is effectively a no-op there. Safe in both environments.
//
// Usage:
//   import { prisma } from "@/lib/prisma";
//   const patients = await prisma.patient.findMany();
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
