"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  | { status: "error"; reason: "invalid" | "wrong" | "unknown" };

/**
 * Email + password sign-in.
 *
 * The user row lives in Supabase Auth (created once via the dashboard or
 * `auth.admin.createUser`). The allowlist still runs in `requireAdmin()`
 * after sign-in — a successful sign-in with an email not on
 * `ADMIN_EMAILS` will land on the forbidden card, not the dashboard. The
 * two checks happen at different times for different reasons: Supabase
 * owns "is this credential valid", this app owns "is this person an
 * operator".
 */
export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", reason: "invalid" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", reason: "invalid" };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase collapses every credential failure ("user not found",
    // "wrong password", "email not confirmed") into the same opaque
    // "Invalid login credentials" — by design, so the form is not an
    // oracle for which addresses have one. We keep the same collapse here.
    return { status: "error", reason: "wrong" };
  }

  const nextParam = formData.get("next");
  const next = typeof nextParam === "string" && nextParam.startsWith("/")
    ? nextParam
    : "/admin";

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}