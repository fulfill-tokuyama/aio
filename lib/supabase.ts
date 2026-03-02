import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Browser client (uses anon key, respects RLS)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

// Admin client (uses service_role key, bypasses RLS) — server-side only
// IMPORTANT: Never import this module from client components
export const supabaseAdmin: SupabaseClient = (() => {
  if (typeof window !== "undefined") {
    console.error("supabaseAdmin must not be used in the browser");
  }
  if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY — admin operations will fail");
  }
  return createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseServiceKey || "placeholder"
  );
})();
