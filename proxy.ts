import { proxy as supabaseProxy } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return supabaseProxy(request);
}

export const config = {
  matcher: [
    // Run on every path EXCEPT static assets, image-optimizer output, the
    // favicon, common image file extensions, and /api/* (route handlers
    // manage their own auth via the Supabase server client directly).
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
