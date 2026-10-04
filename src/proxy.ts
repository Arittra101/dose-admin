import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 renamed `middleware` to `proxy`. Same mechanism, node runtime only.
 *
 * Its one job is refreshing the Supabase session cookie so a long-lived tab
 * does not get signed out mid-review. It is explicitly **not** the
 * authorization layer — `getUser()` here would be an optimistic check, and
 * the real gate is `requireAdmin()` in each page, next to the data read.
 *
 * The `headers` argument to setAll carries the no-store cache headers that
 * @supabase/ssr requires on any response that writes auth cookies; dropping
 * them risks a CDN serving one operator's session token to another.
 */
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
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Touching getUser() is what triggers the refresh-and-write. The result is
  // intentionally unused.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation. Refreshing a
    // token while serving a favicon is pure latency.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
