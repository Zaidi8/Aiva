"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | undefined;

export async function login(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
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
    options: { data: { full_name: fullName } },
  });

  if (authError) {
    return { error: authError.message };
  }
  if (!authData.user) {
    return {
      error:
        "Account created but no session — check your email to confirm, then log in.",
    };
  }

  const authUserId = authData.user.id;

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
    return {
      error:
        "Account created but clinic setup failed. Please contact support.",
    };
  }

  // New clinics land in the guided onboarding flow (clinic details → first
  // doctor → invite team). Returning users log in straight to the dashboard.
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}
