import "server-only";

import { adminDb } from "@/lib/supabase/admin";
import { premiumState, type PremiumState, type UserRow } from "@/lib/db/types";

export const USER_FILTERS = ["all", "premium", "expiring", "expired", "free"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const USER_SORTS = ["joined", "expires", "name"] as const;
export type UserSort = (typeof USER_SORTS)[number];

const SORT_COLUMNS: Record<UserSort, string> = {
  joined: "created_at",
  expires: "premium_until",
  name: "name",
};

export const USERS_PAGE_SIZE = 25;

const SELECT =
  "id,name,email,age,is_anonymous,avatar_url,google_id,timezone,usage_reasons," +
  "created_at,updated_at,last_synced_at,plan,plan_period,plan_source,premium_since,premium_until";

/** Premium lapses inside this window → "expiring", the one renewal nudge. */
export const EXPIRING_SOON_DAYS = 7;

export type UsersQuery = {
  filter: UserFilter;
  sort: UserSort;
  dir: "asc" | "desc";
  page: number;
  q?: string;
};

export type UsersResult = {
  rows: UserRow[];
  total: number;
};

/**
 * Filtering happens in Postgres, not in JS over a page of rows — a search
 * that only looked at the 25 rows already fetched would appear to search all
 * 5,000 and quietly lie about the result.
 *
 * The one thing that cannot be a pure column filter is `premiumState`: it is
 * derived from `plan` *and* `premium_until`, which disagree by design. Each
 * filter is therefore expressed as the equivalent column predicate, and the
 * mapping is kept here next to the derivation it mirrors so the two cannot
 * drift apart.
 */
export async function listUsers(query: UsersQuery): Promise<UsersResult> {
  const db = adminDb();
  const nowIso = new Date().toISOString();

  let q = db.from("users").select(SELECT, { count: "exact" });

  switch (query.filter) {
    case "premium":
      q = q.neq("plan", "free").gt("premium_until", nowIso);
      break;
    case "expiring": {
      const horizon = new Date(
        Date.now() + EXPIRING_SOON_DAYS * 86_400_000,
      ).toISOString();
      q = q
        .neq("plan", "free")
        .gt("premium_until", nowIso)
        .lte("premium_until", horizon);
      break;
    }
    case "expired":
      // Had a grant, and it is gone: either the plan was reset or the date
      // has passed. Both are churn.
      q = q.not("premium_until", "is", null).lte("premium_until", nowIso);
      break;
    case "free":
      q = q.is("premium_until", null);
      break;
    case "all":
      break;
  }

  if (query.q) {
    const needle = query.q.replace(/[%,()]/g, "").trim();
    if (needle) {
      // An id is searched by exact prefix, a person by name or email. The
      // `or` has to be one string for PostgREST.
      const clauses = [`name.ilike.%${needle}%`, `email.ilike.%${needle}%`];
      if (/^[0-9a-f-]{6,}$/i.test(needle)) {
        clauses.push(`id.eq.${needle}`);
      }
      q = q.or(clauses.join(","));
    }
  }

  const from = (query.page - 1) * USERS_PAGE_SIZE;

  const { data, error, count } = await q
    .order(SORT_COLUMNS[query.sort], {
      ascending: query.dir === "asc",
      nullsFirst: false,
    })
    .range(from, from + USERS_PAGE_SIZE - 1);

  if (error) throw new Error(`listUsers: ${error.message}`);

  // See the note in getUser(): no generated Database type yet, so the row
  // shape is asserted rather than inferred.
  return { rows: (data ?? []) as unknown as UserRow[], total: count ?? 0 };
}

export async function getUser(id: string): Promise<UserRow | null> {
  const db = adminDb();
  const { data, error } = await db
    .from("users")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getUser: ${error.message}`);
  // supabase-js cannot infer a row type from a select *string* without
  // generated database types, so single-row reads need the cast. Replace
  // these with `createClient<Database>` once `supabase gen types` can run
  // (it needs the project's access token).
  return (data as unknown as UserRow | null) ?? null;
}

export type UserCounts = Record<PremiumState | "all" | "expiring", number>;

/**
 * Counts for the filter pills and the overview tiles. Five `head: true`
 * count queries rather than one fetch-and-tally: the tally would need every
 * row in the table to be correct, and the point of a count is not paying for
 * that.
 */
export async function countUsersByState(): Promise<UserCounts> {
  const db = adminDb();
  const nowIso = new Date().toISOString();
  const horizon = new Date(
    Date.now() + EXPIRING_SOON_DAYS * 86_400_000,
  ).toISOString();

  const head = { count: "exact" as const, head: true };

  const [all, premium, expiring, expired, free] = await Promise.all([
    db.from("users").select("id", head),
    db.from("users").select("id", head).neq("plan", "free").gt("premium_until", nowIso),
    db
      .from("users")
      .select("id", head)
      .neq("plan", "free")
      .gt("premium_until", nowIso)
      .lte("premium_until", horizon),
    db
      .from("users")
      .select("id", head)
      .not("premium_until", "is", null)
      .lte("premium_until", nowIso),
    db.from("users").select("id", head).is("premium_until", null),
  ]);

  const first = [all, premium, expiring, expired, free].find((r) => r.error);
  if (first?.error) throw new Error(`countUsersByState: ${first.error.message}`);

  return {
    all: all.count ?? 0,
    premium: premium.count ?? 0,
    expiring: expiring.count ?? 0,
    expired: expired.count ?? 0,
    free: free.count ?? 0,
  };
}

/** New sign-ups since an instant — the growth tile on the overview. */
export async function countUsersSince(since: Date): Promise<number> {
  const db = adminDb();
  const { count, error } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  if (error) throw new Error(`countUsersSince: ${error.message}`);
  return count ?? 0;
}

/** Re-exported so pages don't import from two places to render one row. */
export { premiumState };
