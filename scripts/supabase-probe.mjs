import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

const email = process.argv[2] ?? `e2e-probe-${Date.now()}@aiva-test.local`;
const password = process.argv[3] ?? "supersecret123";

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: "Probe" } },
});

console.log("EMAIL:", email);
console.log("ERROR:", error ? JSON.stringify(error, null, 2) : null);
console.log("USER ID:", data?.user?.id ?? null);
console.log("SESSION:", data?.session ? "yes" : "no");
console.log("EMAIL CONFIRMED AT:", data?.user?.email_confirmed_at ?? null);
console.log("CONFIRMATION SENT AT:", data?.user?.confirmation_sent_at ?? null);
