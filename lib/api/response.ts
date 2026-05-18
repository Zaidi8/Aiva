// Aiva — Shared API response helpers.
//
// Every Route Handler under app/api/** returns one of two JSON envelopes:
//
//   { data: T }                            — success
//   { error: { code, message, fields? } }  — failure
//
// Use the helpers below; never hand-roll a NextResponse.json. Client code
// (lib/client/fetcher.ts) relies on this exact shape.

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

type FieldErrors = Record<string, string[]>;

export function ok<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  code: string,
  message: string,
  status: number,
  fields?: FieldErrors,
) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

export function failValidation(error: ZodError) {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fail("VALIDATION_FAILED", "Invalid input.", 422, fields);
}

export const failUnauthorized = () =>
  fail("UNAUTHORIZED", "Sign in required.", 401);
export const failForbidden = () => fail("FORBIDDEN", "Not allowed.", 403);
export const failNotFound = (resource = "Resource") =>
  fail("NOT_FOUND", `${resource} not found.`, 404);
export const failConflict = (message: string) =>
  fail("CONFLICT", message, 409);
