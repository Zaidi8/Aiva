// Server Supabase client — for Server Components, Server Actions, Route Handlers.
// Reads cookies via Next's async `cookies()` (Next 15+).
// setAll is wrapped in try/catch because Server Components cannot write cookies;
// middleware (lib/supabase/middleware.ts) is what actually refreshes the session.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies. Middleware handles refresh.
          }
        },
      },
    }
  );
}
