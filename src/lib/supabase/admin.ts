import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so:
 *
 *   - `import "server-only"` above makes a client-component import a build
 *     error rather than a leaked key.
 *   - every caller must already have passed `requireAdmin()`. There is no
 *     row-level safety net behind this client; the route guard *is* the
 *     authorization.
 *
 * An operator needs every row of public.users, public.plans,
 * public.pending_claims and public.transactions, which `anon` is not
 * entitled to, so without this key the dashboard has nothing to show.
 * We fail loudly on the placeholder value instead of surfacing an opaque
 * "permission denied" on every page.
 */
let cached: SupabaseClient | null = null;

export class MissingServiceKeyError extends Error {
  constructor() {
    super(
      "SUPABASE_SERVICE_ROLE_KEY is missing or still the local placeholder. " +
        "Copy the service_role key from Supabase → Project Settings → API keys " +
        "into .env.local; the dashboard cannot read public.users without it.",
    );
    this.name = "MissingServiceKeyError";
  }
}

export function hasServiceKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(key) && key !== "local-dev-unused";
}

export function adminDb(): SupabaseClient {
  if (!hasServiceKey()) throw new MissingServiceKeyError();
  if (cached) return cached;

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "x-application-name": "dose-admin" } },
    },
  );

  return cached;
}
