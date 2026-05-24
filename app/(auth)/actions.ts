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
    clinicPhone: formData.get("clinicPhone") ?? "",
    clinicAddress: formData.get("clinicAddress") ?? "",
    clinicEmail: formData.get("clinicEmail") ?? "",
    jobTitle: formData.get("jobTitle") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const {
    email,
    password,
    fullName,
    clinicName,
    clinicPhone,
    clinicAddress,
    clinicEmail,
    jobTitle,
  } = parsed.data;

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
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          phone: clinicPhone,
          address: clinicAddress,
          email: clinicEmail,
          // timezone defaults to "Asia/Karachi" via the schema — don't ask
          // the user during registration.
        },
      });
      await tx.clinicStaff.create({
        data: {
          authUserId,
          fullName,
          email,
          role: "Admin",
          jobTitle,
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

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}
