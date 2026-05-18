import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2];
if (!email) {
  console.log("usage: node scripts/supabase-find-user.mjs <email>");
  process.exit(1);
}

// listUsers paginates — for our test purposes, scan first 1000.
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) { console.error(error); process.exit(1); }
const found = data.users.filter(u => u.email === email);
console.log(JSON.stringify(found, null, 2));
console.log(`(total users in page: ${data.users.length})`);
