import type { Kpi } from "@/components/Kpi";
import {
  EXPIRING_SOON_DAYS,
  type UserCounts,
  type UserFilter,
  type UserSort,
} from "@/lib/db/users";
import { formatCount, plural } from "@/lib/format";
import { href } from "@/lib/url";

/**
 * Everything two pages need to agree on about the *users view*.
 *
 * The Overview and the Users page both render the same three user tiles and
 * both link into the same filtered table. When each page built those itself
 * they drifted: one hard-coded `/admin/users?status=premium` while the other
 * went through `href()`, one keyed the first tile `users` and the other
 * `total`, and one wrote "Expiring this week" next to the other's "Expiring
 * in 7 days" for the same `EXPIRING_SOON_DAYS` window. A number on the
 * overview that disagrees with the page it links to is the one bug this
 * dashboard cannot afford, so the view is defined once, here.
 */
export const USERS_BASE = "/admin/users";

/**
 * The resting view. `href()` strips any param equal to its default, so every
 * link to the unfiltered table collapses to a bare `/admin/users` instead of
 * one page emitting `?status=all` and the other not.
 */
export const USERS_VIEW_DEFAULTS = {
  status: "all",
  sort: "joined",
  dir: "desc",
} as const;

/** Filter pills. Short, because they sit in a row of five. */
export const FILTER_LABELS: Record<UserFilter, string> = {
  all: "All",
  premium: "Premium",
  expiring: `Expiring in ${EXPIRING_SOON_DAYS}d`,
  expired: "Lapsed",
  free: "Free",
};

/** Sortable column headers. */
export const SORT_LABELS: Record<UserSort, string> = {
  joined: "Joined",
  expires: "Expires",
  name: "User",
};

/** Spelled out, because a KPI label has the room a pill does not. */
export const EXPIRING_LABEL = `Expiring in ${EXPIRING_SOON_DAYS} days`;

/** A link into the users table with the given filter applied. */
export function usersHref(
  params: Record<string, string | number | undefined | null>,
): string {
  return href(USERS_BASE, params, USERS_VIEW_DEFAULTS);
}

/**
 * The three tiles that describe user state, identical on every page that
 * shows them — same keys, so `data-testid="kpi-total"` means the same tile
 * wherever a test finds it.
 */
export function userStateTiles(counts: UserCounts): Kpi[] {
  return [
    {
      key: "total",
      label: "Total users",
      value: formatCount(counts.all),
      hint: plural(counts.free, "on free", "on free"),
    },
    {
      key: "premium",
      label: "Premium now",
      value: formatCount(counts.premium),
      hint:
        counts.all > 0
          ? `${Math.round((counts.premium / counts.all) * 100)}% of all users`
          : undefined,
      href: usersHref({ status: "premium" }),
    },
    {
      key: "expiring",
      label: EXPIRING_LABEL,
      value: formatCount(counts.expiring),
      hint: counts.expiring === 0 ? "No renewals due" : "Worth a reminder",
      href: usersHref({ status: "expiring" }),
    },
  ];
}
