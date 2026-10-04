"use client";

import { useActionState } from "react";

import { signInWithPassword, type SignInState } from "@/app/auth-actions";
import { Spinner } from "@/components/Spinner";

/**
 * Email + password. Two fields, one button.
 *
 * Error copy is collapsed on purpose: Supabase returns "Invalid login
 * credentials" for both "user not found" and "wrong password", and we
 * keep the same opacity here so the form is not an oracle for which
 * addresses have an account.
 *
 * `pending` drives everything: disabled, aria-busy, the spinner, the
 * label swap. The result is inline and announced via role="status".
 */
const COPY: Record<string, string> = {
  invalid: "Enter an email and a password.",
  wrong: "Email or password is incorrect.",
  unknown: "Could not sign in. Try again in a moment.",
};

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    { status: "idle" },
  );

  return (
    <>
      <h1 className="text-[26px]">Admin sign-in</h1>
      <p className="mt-2 text-ink-2">
        Operator accounts only.
      </p>

      <form action={action} className="mt-6 space-y-3" aria-busy={pending}>
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="email" className="label-micro block">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="field mt-2"
            data-testid="signin-email"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-micro block">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field mt-2"
            data-testid="signin-password"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary w-full"
          data-testid="signin-submit"
        >
          {pending ? <Spinner size={15} /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </button>

        {state.status === "error" ? (
          <p
            role="alert"
            className="text-[12px] text-danger"
            data-testid="signin-error"
          >
            {COPY[state.reason]}
          </p>
        ) : null}
      </form>
    </>
  );
}