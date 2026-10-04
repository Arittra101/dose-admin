import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request-scoped Supabase client that carries the operator's own session.
 *
 * Use it for auth only — who is signed in. All dashboard reads go through
 * `adminDb()` instead, because the operator's own JWT is subject to the same
 * RLS as any user and would see only their own row.
 *
 * A new client per request is required: @supabase/ssr hands the no-store
 * cache headers to `setAll` only on the first cookie write, so a reused
 * client would leave later responses cacheable with someone's session in
 * them.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component render this throws — cookies are
          // read-only there. Token refresh is handled by proxy.ts, which
          // can write, so swallowing it here is correct rather than
          // merely convenient.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // no-op: see above
          }
        },
      },
    },
  );
}
