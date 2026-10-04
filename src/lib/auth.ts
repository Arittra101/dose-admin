import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Authorization is an email allowlist in ADMIN_EMAILS, not a database role.
 *
 * There is no `admins` table in this project, and inventing one would mean
 * the dashboard's access control lived in the same rows the dashboard edits.
 * An env allowlist is deploy-time state: changing who can read the dashboard
 * requires a deploy, which for a two-operator finance tool is the feature,
 * not the limitation.
 */
function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  // getUser() revalidates the JWT with Supabase. getSession() reads it
  // straight from the cookie, which a client could have forged, so it is
  // never the basis for an authorization decision.
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowlist().includes(email.toLowerCase());
}

export type AdminGate =
  | { ok: true; user: User; email: string }
  | { ok: false; reason: "forbidden"; email: string | null };

/**
 * The gate every admin route opens with.
 *
 * Unauthenticated → redirect to sign-in with `?next=`, because there is
 * nothing to tell the visitor yet. Authenticated but not on the allowlist →
 * return `forbidden` so the page can render the forbidden *card*. A redirect
 * there would be a lie: the route exists, and the person is simply not
 * allowed, which they are entitled to be told.
 */
export async function requireAdmin(nextPath: string): Promise<AdminGate> {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  const email = user.email ?? null;
  if (!isAdminEmail(email)) {
    return { ok: false, reason: "forbidden", email };
  }

  return { ok: true, user, email: email! };
}

/** For server actions, where rendering a card is not an option. */
export async function assertAdmin(): Promise<
  { ok: true; email: string } | { ok: false }
> {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false };
  return { ok: true, email: user.email! };
}
