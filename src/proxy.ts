import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh the session and gate responder routes. The matcher only runs this on
// protected paths, so public/offline pages (SOS, map) never depend on it.
// ponytail: matcher-scoped guard; widen the matcher when more routes need auth.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

// /api/route proxies to the internal OSRM box; gate it to logged-in responders
// so it can't be used as an open routing proxy. /api/export stays public (it's
// intentionally open humanitarian data from the PII-free views).
export const config = {
  matcher: [
    "/panel/:path*",
    "/coordinador/:path*",
    "/recursos/:path*",
    "/api/route",
  ],
};
