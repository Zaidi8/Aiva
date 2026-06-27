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
// Transient-error retry: the DB runs behind the Supabase pgbouncer pooler with
// connection_limit=1 (the correct per-instance setting for serverless). When
// several requests hit the dashboard at once (summary + notifications +
// appointments fire on mount), they contend for that single connection and the
// pooler occasionally returns a transient error ("Can't reach database server",
// P1001 / pool timeout P2024) instead of queuing. These are safe to retry: a
// short backoff lets the connection free up. We retry idempotent read
// operations only — writes are left alone so a partially-applied mutation is
// never silently re-run.
//
// Usage:
//   import { prisma } from "@/lib/prisma";
//   const patients = await prisma.patient.findMany();
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma, PrismaClient } from "@prisma/client";

// Prisma error codes for "the database/pooler was transiently unreachable".
// https://www.prisma.io/docs/orm/reference/error-reference
const TRANSIENT_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server reached but timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a connection from the pool
]);

const TRANSIENT_MESSAGE =
  /can't reach database|connection pool|connection closed|server has closed|terminating connection|ECONNRESET|ETIMEDOUT/i;

function isTransient(err: unknown): boolean {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_CODES.has(err.code)
  ) {
    return true;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return TRANSIENT_MESSAGE.test(message);
}

// Read-only operation names that are safe to replay on a transient failure.
const RETRYABLE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createPrismaClient() {
  const base = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return base.$extends({
    name: "transient-retry",
    query: {
      async $allOperations({ operation, args, query }) {
        if (!RETRYABLE_OPS.has(operation)) return query(args);
        const maxAttempts = 4;
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            if (attempt >= maxAttempts || !isTransient(err)) throw err;
            // 60ms, 120ms, 240ms — enough for the single pooled connection to
            // free up between concurrent dashboard fetches.
            await sleep(60 * 2 ** (attempt - 1));
          }
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
