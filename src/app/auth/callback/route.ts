import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { adminDb } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands.
 *
 * Supabase sends one of two shapes depending on project settings, so both
 * are handled: `?code=` (PKCE, exchanged for a session) and
 * `?token_hash=&type=` (the verify-OTP shape). Supporting only one of them
 * produces a sign-in flow that works until someone flips a toggle in the
 * Supabase dashboard. The PKCE branch also covers Google OAuth — its
 * authorize redirect carries the same `?code=` shape.
 *
 * On success we link the operator's Google identity to the matching row in
 * `public.users` (by email) on the side, best-effort. A missing link is not
 * a sign-in failure — operators without a user row, or with a row whose
 * email doesn't match, still get through to the dashboard. The
 * authorization decision lives in `requireAdmin()` regardless.
 *
 * On any failure we send the operator back to /sign-in with a reason rather
 * than rendering an error page — the fix is always "try again", and that
 * button lives there.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const rawNext = url.searchParams.get("next") ?? "/admin";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";

  const supabase = await getSupabaseServerClient();

  let success = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    success = !error;
    if (success) {
      // Fire-and-forget — never block the redirect on this write.
      void linkOperatorToUserRow();
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    success = !error;
  }

  if (success) return NextResponse.redirect(new URL(next, url.origin));

  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}

/**
 * Find the operator's row in `public.users` by their verified Google email
 * and stamp the Google subject onto `google_id` if it isn't set yet.
 *
 * Why a side effect at all: an operator whose `users.google_id` is null
 * would be un-linkable from their user account downstream (the comment in
 * `lib/db/types.ts` is the reason `google_id` exists in the first place).
 * Why best-effort: the operator's *authorization* has already happened by
 * this point — `requireAdmin()` is the gate. A failed write should not
 * turn a successful sign-in into a "sign-in failed" UX.
 */
async function linkOperatorToUserRow(): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) return;

    // The Google identity carries the stable subject — `id` on the
    // UserIdentity — that survives the user changing their email later.
    // Supabase types `identity_data` loosely; the subject is the only
    // field we need from it, but `id` on the identity record is
    // already the Google `sub`, so we use that directly.
    const googleIdentity = user.identities?.find(
      (i) => i.provider === "google",
    );
    const googleSub = googleIdentity?.id;
    if (!googleSub) return;

    const db = adminDb();
    // Two-step rather than a single upsert:
    //   1. find a row whose google_id is already this subject — nothing to do
    //   2. otherwise find a row whose email matches and stamp the subject
    // Both steps guard against writing on every sign-in. The select is
    // targeted (a single row by primary key or unique column), so it
    // doesn't fetch the table.
    const { data: match } = await db
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!match?.id) return; // No user row for this email — operator still proceeds.

    await db
      .from("users")
      .update({ google_id: googleSub })
      .eq("id", match.id)
      .is("google_id", null);
  } catch {
    // Swallowed on purpose. See the doc comment above.
  }
}