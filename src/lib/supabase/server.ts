import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

// Server-side Supabase client (Server Components, Route Handlers, Actions). Reads
// the user's session from cookies and refreshes it via setAll. Still anon-key +
// RLS; never use the service-role key here.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll can be called from a Server Component where cookies are
            // read-only. Session refresh is then handled by middleware instead.
          }
        },
      },
    },
  );
}
