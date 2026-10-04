/**
 * The shapes this dashboard reads. Derived from the live `dose` schema, not
 * invented: see the field notes on each one.
 */

/**
 * public.users
 *
 * Two things about this table drive most of the dashboard:
 *
 *   1. `plan` is authoritative for *current* state, and it is reset to
 *      "free" when premium lapses — a row can therefore be `plan: "free"`
 *      with a non-null `premium_until` in the past. That is a churned user,
 *      not a free one, and it is a different operational fact, so the
 *      dashboard shows it as its own status ("Expired") rather than folding
 *      it in with people who never paid.
 *   2. Most users are anonymous (`is_anonymous`, no email). An anonymous row
 *      has nothing to search by except its id, so the users table must stay
 *      legible with name-only identities.
 */
export type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  age: number | null;
  is_anonymous: boolean;
  avatar_url: string | null;
  google_id: string | null;
  timezone: string | null;
  usage_reasons: string[] | null;
  created_at: string;
  updated_at: string | null;
  last_synced_at: string | null;
  plan: string | null;
  plan_period: string | null;
  plan_source: string | null;
  premium_since: string | null;
  premium_until: string | null;
};

/** Derived, never stored. See `premiumState()`. */
export type PremiumState = "premium" | "expired" | "free";

/**
 * public.plans — keyed by `period`; there is no surrogate id.
 * `duration` is a Postgres interval rendered as text ("1 mon", "1 year").
 */
export type PlanRow = {
  period: string;
  amount: number | null;
  duration: string | null;
  is_active: boolean | null;
};

/**
 * Derive the premium state the operator cares about from the two columns
 * that disagree with each other by design.
 */
export function premiumState(
  user: Pick<UserRow, "plan" | "premium_until">,
  now: Date = new Date(),
): PremiumState {
  const until = user.premium_until ? new Date(user.premium_until) : null;
  const active = Boolean(until && until.getTime() > now.getTime());

  if ((user.plan ?? "free") !== "free" && active) return "premium";
  // A lapsed grant: plan has been reset but the history is still on the row.
  if (until) return "expired";
  return "free";
}

/** Days until premium lapses; negative when it already has. */
export function daysUntil(
  value: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((then - now.getTime()) / 86_400_000);
}

/**
 * public.pending_claims
 *
 * A user who has paid outside the app and is claiming the premium it buys:
 * they submit the bKash transaction id and the amount, and an operator
 * decides. This is the dashboard's work queue — the "pending user".
 *
 * `status` is free text in the database, so nothing here narrows it to a
 * literal union. `StatusPill` renders an unmapped value legibly rather than
 * blanking the cell, which is the right behaviour for a vocabulary this app
 * does not own. The *structural* question — is this claim still open? — is
 * answered by `resolved_at`, which is null until someone resolves it, and
 * that is what the filters use.
 */
export type PendingClaimRow = {
  id: string;
  user_id: string;
  trx_id: string;
  amount: number | null;
  status: string;
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
};

/**
 * public.transactions — the bKash messages the system has actually seen,
 * keyed by `trx_id`.
 *
 * This is the other half of the operator's judgement. A claim quotes a
 * transaction id; this table says whether a payment carrying that id ever
 * arrived, for how much, and from whom. A claim with no matching row here is
 * the one an operator must not wave through.
 */
export type TransactionRow = {
  trx_id: string;
  amount: number | null;
  sender: string | null;
  occurred_at: string | null;
  received_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
};

/** Is this claim still waiting on someone? */
export function isOpenClaim(claim: Pick<PendingClaimRow, "resolved_at">): boolean {
  return claim.resolved_at === null;
}
