import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

// Browser-side Supabase client. Uses the anon key — every read/write is gated by
// RLS, so this is safe to ship to the client. Citizens use this anonymously.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
