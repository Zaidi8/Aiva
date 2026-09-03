// PATCH /api/auth/password
// Change the caller's own password. Verifies their CURRENT password against
// Supabase Auth (so a hijacked-but-logged-in session can't silently change the
// password without knowing it), then updates it and clears the forced-change
// flag if present.
//
// This replaces the old "not connected yet" Security tab. Email/password
// ownership lives in Supabase Auth, not the ClinicStaff row — so this works
// through the cookie session, not a DB write.

import type { NextRequest } from "next/server";
import { withApiStaff } from "@/lib/api/with-staff";
import { ok, fail, failValidation } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export const PATCH = withApiStaff(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);

  const { currentPassword, newPassword } = parsed.data;

  // The SSR client resolves the signed-in user from the session cookie. If the
  // session is gone (expired between the staff lookup and here), bail cleanly.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("UNAUTHORIZED", "Your session expired. Please log in again.", 401);
  }

  // Re-authenticate with the CURRENT password so a stale/hijacked session can't
  // change the password without knowing the existing one.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });
  if (signInError) {
    return fail("INVALID_CURRENT_PASSWORD", "Current password is incorrect.", 400);
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return fail("UPDATE_FAILED", updateError.message, 400);
  }

  // Clear the forced-password-change flag in case it was still set, so the next
  // login goes straight to the dashboard. Best-effort — the new password is
  // already saved.
  if (user.user_metadata?.must_change_password) {
    await supabase.auth.updateUser({
      data: { must_change_password: false },
    });
  }

  return ok({ updated: true });
});
