"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

// `notice` is a non-error message the form surfaces (e.g. "check your email").
export type ActionResult = { error?: string; notice?: string } | undefined;

export async function login(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");

  // If this login used a temp password (provisioned team member), force a real
  // password before granting dashboard access.
  if (data.session?.user?.user_metadata?.must_change_password) {
    redirect("/set-password");
  }

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    fullName: formData.get("fullName") ?? "",
    clinicName: formData.get("clinicName") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password, fullName, clinicName } = parsed.data;

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    // Stash clinic_name alongside full_name so the clinic can be provisioned
    // later (e.g. after email confirmation) without re-collecting it.
    options: { data: { full_name: fullName, clinic_name: clinicName } },
  });

  if (authError) {
    return { error: authError.message };
  }
  if (!authData.user) {
    return {
      error: "Sign-up failed. Please try again.",
    };
  }

  // Supabase does NOT error on a duplicate email (that would leak which emails
  // are registered). Instead it returns a user with an empty `identities`
  // array. Detect that and give a real message instead of a confusing
  // "setup failed" further down.
  if ((authData.user.identities?.length ?? 0) === 0) {
    return {
      error:
        "An account with this email already exists. Try logging in instead.",
    };
  }

  const authUserId = authData.user.id;

  // Provision the clinic + admin staff + AiSettings atomically. On ANY failure
  // roll back the just-created auth user so we never strand a login with no
  // clinic (which can neither sign in usefully nor re-register). Mirrors the
  // rollback in lib/staff/mutations.ts.
  try {
    await prisma.$transaction(async (tx) => {
      // Only the clinic NAME is set at sign-up; contact details + timezone are
      // captured in the /onboarding flow. timezone defaults to "Asia/Karachi".
      const clinic = await tx.clinic.create({
        data: { name: clinicName },
      });
      await tx.clinicStaff.create({
        data: {
          authUserId,
          fullName,
          email,
          role: "Admin",
          clinicId: clinic.id,
        },
      });
      // Seed AiSettings with a greeting personalized to the clinic. The
      // schema default would say "Hello! Thank you for calling. How may I
      // help you today?" with no clinic name — patients dialing the AI
      // would have no idea which practice they reached. We can fully
      // overwrite this from Settings → AI later.
      await tx.aiSettings.create({
        data: {
          clinicId: clinic.id,
          greetingMessage: `Hello! Thank you for calling ${clinicName}. How may I help you today?`,
        },
      });
    });
  } catch (e) {
    console.error("Clinic provisioning failed for user", authUserId, e);
    // Best-effort rollback of the orphaned auth user via the service-role
    // client (the cookie client can't call auth.admin.*).
    await createAdminClient()
      .auth.admin.deleteUser(authUserId)
      .catch(() => {
        // If cleanup fails the user can't re-register; logged for support.
        console.error("Failed to roll back auth user", authUserId);
      });
    return {
      error: "Couldn't finish setting up your account. Please try again.",
    };
  }

  // If email confirmation is ON, signUp returns a user but NO session. Sending
  // them to /onboarding would just bounce off the auth proxy — instead tell
  // them to confirm first. The clinic is already provisioned, so once they
  // confirm and log in everything is ready.
  if (!authData.session) {
    return {
      notice:
        "Account created! Check your email to confirm, then log in to finish setup.",
    };
  }

  // New clinics land in the guided onboarding flow (clinic details → first
  // doctor → invite team). Returning users log in straight to the dashboard.
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export type SetPasswordAction = ActionResult;

export async function setPassword(formData: FormData): Promise<SetPasswordAction> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Please log in again." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: updateError.message };
  }

  // Clear the forced-change flag so the next login goes straight to dashboard.
  const { error: metaError } = await supabase.auth.updateUser({
    data: { must_change_password: false },
  });
  if (metaError) {
    return { error: metaError.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}
