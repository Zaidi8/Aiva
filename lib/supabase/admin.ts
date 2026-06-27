// Aiva — Supabase ADMIN client (service-role).
//
// SERVER-ONLY. Holds the service_role secret (SUPABASE_SECRET_KEY) which
// bypasses RLS and can manage auth users. NEVER import this from a 'use client'
// file. The SSR cookie client in lib/supabase/server.ts uses the publishable
// key and CANNOT call auth.admin.* — that's why this separate client exists.

import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
