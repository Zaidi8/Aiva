// Edge proxy Supabase client + route gating (Next.js 16 proxy.ts).
//
// CRITICAL (per Supabase SSR docs): nothing should run between
// createServerClient() and supabase.auth.getUser() — any code in between
// can cause random user logouts. Keep this function's body in that order.
//
// Cookie sync: handlers must write to BOTH request.cookies and the response
// cookies. If the two get out of sync, sessions break.
//
// Verifying with getUser() (not just reading the cookie) is what makes this
// a real auth check: getUser() validates the JWT signature against Supabase's
// public keys and refreshes the token if needed. A bare cookie-presence check
// would let forged or expired cookies through.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = ["/auth"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do NOT add code between createServerClient() above and getUser() below.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  const isAuthPage = AUTH_PAGES.includes(pathname);
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirectedFrom");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
