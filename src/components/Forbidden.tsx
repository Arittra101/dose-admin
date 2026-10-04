import { signOut } from "@/app/auth-actions";

/**
 * Authenticated but not on the allowlist. A single card, not a redirect: the
 * route exists and the person is simply not allowed, and bouncing them to
 * sign-in would imply their session is the problem and send them round the
 * loop again. The sign-out button is the actual way forward.
 */
export function Forbidden({ email }: { email?: string | null }) {
  return (
    <div className="container-page py-14">
      <div className="card max-w-md p-7" data-testid="admin-forbidden">
        <h1 className="text-[26px]">Not an admin account</h1>
        <p className="mt-3 text-ink-2">
          {email ? (
            <>
              <span className="break-all font-medium text-ink">{email}</span> is
              signed in, but it is not on the operator allowlist.
            </>
          ) : (
            "This account is not on the operator allowlist."
          )}
        </p>
        <p className="mt-2 text-small text-ink-3">
          Ask whoever runs the deployment to add the address to ADMIN_EMAILS.
        </p>
        <form action={signOut} className="mt-5">
          <button type="submit" className="btn btn-secondary btn-sm">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * The other way a dashboard page can have nothing to show: the service-role
 * key is absent, so `adminDb()` throws before any read runs. That is a
 * deployment mistake, not a data state, so it gets its own card with the fix
 * in it rather than an empty table.
 *
 * The copy names the tables this app actually reads — `users` and `plans`.
 * It used to say "payments" and `transactions`, which sent whoever hit the
 * card looking for a permissions problem on a table the dashboard never
 * touches.
 */
export function MissingServiceKey() {
  return (
    <div className="container-page py-14">
      <div className="card max-w-xl p-7" data-testid="admin-no-service-key">
        <h1 className="text-[26px]">Database key not configured</h1>
        <p className="mt-3 text-ink-2">
          The dashboard reads{" "}
          <span className="font-mono text-[13px]">users</span>,{" "}
          <span className="font-mono text-[13px]">plans</span>,{" "}
          <span className="font-mono text-[13px]">pending_claims</span> and{" "}
          <span className="font-mono text-[13px]">transactions</span> with the
          Supabase <span className="font-mono text-[13px]">service_role</span>{" "}
          key, and{" "}
          <span className="font-mono text-[13px]">
            SUPABASE_SERVICE_ROLE_KEY
          </span>{" "}
          is missing or still set to the local placeholder. An operator needs
          every row of all four, which the{" "}
          <span className="font-mono text-[13px]">anon</span> role is not
          entitled to, so there is nothing to show without it.
        </p>
        <div className="mt-4 rounded-2xl bg-bg-alt/70 p-4">
          <p className="label-micro">Fix</p>
          <p className="mt-2 text-small text-ink-2">
            Supabase dashboard → Project Settings → API keys → copy{" "}
            <span className="font-mono">service_role</span> into{" "}
            <span className="font-mono">.env.local</span>, then restart{" "}
            <span className="font-mono">npm run dev</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
