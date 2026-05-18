import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2];
if (!email) { console.log("usage: scripts/supabase-signout.mjs <email>"); process.exit(1); }

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) { console.error(listErr); process.exit(1); }
const user = list.users.find(u => u.email === email);
if (!user) { console.log("user not found"); process.exit(1); }

const { error } = await supabase.auth.admin.signOut(user.id);
console.log("signout error:", error);
console.log("signed out user:", user.id);
