// Aiva — Prisma error → HTTP response mapper.
//
// Translates the most common Prisma "known request errors" into the project's
// API response envelope. Returns `null` when the error is not one we map —
// caller should rethrow and let the runtime turn it into a 500.
//
// Wire-up:
//
//   try {
//     return ok(await createPatient(staff, input));
//   } catch (e) {
//     const mapped = mapPrismaError(e);
//     if (mapped) return mapped;
//     throw e;
//   }

import { Prisma } from "@prisma/client";
import { fail, failConflict, failNotFound } from "./response";

export function mapPrismaError(e: unknown): Response | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (e.code) {
    case "P2002": {
      const target = Array.isArray(e.meta?.target)
        ? (e.meta!.target as string[]).join(",")
        : "unique constraint";
      return failConflict(`Duplicate value for ${target}.`);
    }
    case "P2003":
      return fail("FK_VIOLATION", "Related record missing or invalid.", 422);
    case "P2025":
      return failNotFound();
    default:
      return null;
  }
}
