import Link from "next/link";
import type { Metadata } from "next";

import { FilterPill, FilterRow, Pagination, SearchForm } from "@/components/Filters";
import { Forbidden, MissingServiceKey } from "@/components/Forbidden";
import { KpiGrid, type Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Dash, Empty, Identity, TableCard, Td, Th, Tr } from "@/components/Table";
import { requireAdmin } from "@/lib/auth";
import {
  USERS_PAGE_SIZE,
  USER_FILTERS,
  USER_SORTS,
  countUsersByState,
  listUsers,
  type UserFilter,
  type UserSort,
} from "@/lib/db/users";
import { daysUntil, premiumState } from "@/lib/db/types";
import { hasServiceKey } from "@/lib/supabase/admin";
import { formatCount, formatDate, orDash, plural } from "@/lib/format";
import {
  FILTER_LABELS,
  SORT_LABELS,
  USERS_VIEW_DEFAULTS,
  userStateTiles,
  usersHref,
} from "@/lib/user-views";
import { intParam, oneOf, strParam } from "@/lib/url";

export const metadata: Metadata = {
  // See the note on the overview: `robots` comes from the root layout.
  title: "Users — Dose Care Admin",
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const gate = await requireAdmin("/admin/users");
  if (!gate.ok) return <Forbidden email={gate.email} />;
  if (!hasServiceKey()) return <MissingServiceKey />;

  const params = await searchParams;

  // The default here is "all". There is no work queue on this page — nothing
  // about a user row is waiting to be actioned — so defaulting to a subset
  // would hide the thing an operator came to look up.
  const filter = oneOf<UserFilter>(params.status, USER_FILTERS, "all");
  const sort = oneOf<UserSort>(params.sort, USER_SORTS, "joined");
  const dir = oneOf(params.dir, ["asc", "desc"] as const, "desc");
  const page = intParam(params.page, 1);
  const q = strParam(params.q);

  const [counts, result] = await Promise.all([
    countUsersByState(),
    listUsers({ filter, sort, dir, page, q }),
  ]);

  const carry = { status: filter, sort, dir, q };

  const tiles: Kpi[] = [
    ...userStateTiles(counts),
    {
      key: "lapsed",
      label: "Lapsed",
      value: formatCount(counts.expired),
      hint: "Paid once, now expired",
      href: usersHref({ status: "expired" }),
    },
  ];

  function sortFor(column: UserSort) {
    const active = sort === column;
    // Clicking the active column flips direction; a new column starts
    // descending, which for dates and money is the useful end.
    const nextDir = active && dir === "desc" ? "asc" : "desc";
    return {
      dir: active ? dir : null,
      href: usersHref({ ...carry, sort: column, dir: nextDir, page: 1 }),
    } as const;
  }

  return (
    <div className="container-wide py-12">
      <PageHeader
        title="Users"
        subtitle="Premium state is derived from plan and premium_until, which disagree on purpose: a free plan with an expiry in the past is a lapsed subscriber, not a new signup."
      />

      <KpiGrid heading="User totals" id="user-kpis" tiles={tiles} />

      <FilterRow label="Filter users" count={plural(result.total, "user", "users")}>
        {USER_FILTERS.map((f) => (
          <FilterPill
            key={f}
            href={usersHref({ ...carry, status: f, page: 1 })}
            active={f === filter}
          >
            {FILTER_LABELS[f]}
          </FilterPill>
        ))}
        <SearchForm
          action="/admin/users"
          defaultValue={q}
          placeholder="Name, email or user id"
          // Defaults are dropped here for the same reason `href()` drops
          // them: otherwise searching from the resting view would land on
          // `?sort=joined&dir=desc&q=…` while every pill beside it produces a
          // bare path, and the two would look like different views.
          hidden={{
            status: filter === USERS_VIEW_DEFAULTS.status ? undefined : filter,
            sort: sort === USERS_VIEW_DEFAULTS.sort ? undefined : sort,
            dir: dir === USERS_VIEW_DEFAULTS.dir ? undefined : dir,
          }}
        />
      </FilterRow>

      <TableCard
        minWidth={940}
        empty={
          result.rows.length === 0 ? (
            <Empty>{q ? `No user matches “${q}”.` : "No user in this group."}</Empty>
          ) : undefined
        }
      >
        <thead>
          <tr>
            <Th sort={sortFor("name")}>{SORT_LABELS.name}</Th>
            <Th>Status</Th>
            <Th>Plan</Th>
            <Th>Source</Th>
            <Th sort={sortFor("expires")}>{SORT_LABELS.expires}</Th>
            <Th sort={sortFor("joined")}>{SORT_LABELS.joined}</Th>
            <Th align="right">Detail</Th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((u) => {
            const state = premiumState(u);
            const left = daysUntil(u.premium_until);

            return (
              <Tr key={u.id} data-testid="user-row" data-user={u.id} data-plan-status={state}>
                <Td>
                  <Identity
                    primary={u.name ?? "Unnamed"}
                    secondary={
                      u.email ?? (u.is_anonymous ? "Anonymous account" : undefined)
                    }
                    tertiary={
                      <span className="font-mono text-[12px]">{u.id.slice(0, 8)}</span>
                    }
                  />
                </Td>
                <Td>
                  <StatusPill status={state} />
                </Td>
                <Td className="text-ink-2">{orDash(u.plan_period)}</Td>
                <Td className="text-ink-2">{orDash(u.plan_source)}</Td>
                <Td>
                  {u.premium_until ? (
                    <>
                      <p className="text-ink-2">{formatDate(u.premium_until)}</p>
                      {left !== null ? (
                        <p className="text-small text-ink-3">
                          {left >= 0 ? `${left}d left` : `${-left}d ago`}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <Dash />
                  )}
                </Td>
                <Td className="text-ink-2">{formatDate(u.created_at)}</Td>
                <Td align="right">
                  <Link href={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">
                    Open
                  </Link>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableCard>

      <Pagination
        page={page}
        pageSize={USERS_PAGE_SIZE}
        total={result.total}
        hrefFor={(p) => usersHref({ ...carry, page: p })}
      />
    </div>
  );
}
