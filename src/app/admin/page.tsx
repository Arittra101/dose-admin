import type { Metadata } from "next";

import { Forbidden, MissingServiceKey } from "@/components/Forbidden";
import { KpiGrid, type Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Dash, Empty, Identity, TableCard, Td, Th, Tr } from "@/components/Table";
import { requireAdmin } from "@/lib/auth";
import { countPaymentsAwaitingReview } from "@/lib/db/payments";
import { countActiveByPeriod, listPlans } from "@/lib/db/plans";
import { daysUntil, premiumState as derivePremiumState } from "@/lib/db/types";
import {
  EXPIRING_SOON_DAYS,
  countUsersByState,
  countUsersSince,
  listUsers,
} from "@/lib/db/users";
import { hasServiceKey } from "@/lib/supabase/admin";
import { formatCount, formatDate, orDash, plural } from "@/lib/format";
import { EXPIRING_LABEL, userStateTiles, usersHref } from "@/lib/user-views";

export const metadata: Metadata = {
  // `robots` is inherited from the root layout, which marks the whole app
  // noindex. Repeating it per page only creates somewhere for the two to
  // disagree.
  title: "Overview — Dose Care Admin",
};

/**
 * The default route. The sidebar always lands here, so this is what an
 * authenticated admin sees when no filter is in play — the four numbers that
 * answer "is the product healthy right now?", and the few rows that show
 * where the work is.
 *
 * The first tile is the pending-payments queue, because it is the only
 * number here that is someone waiting rather than something to know. There
 * is still no revenue tile: a figure whose rows no page in this app can show
 * is worse than no figure at all.
 *
 * The user tiles and every link into the users table come from
 * `lib/user-views.ts`, shared with the Users page. That is deliberate — the
 * overview exists to be drilled into, so its figures must be the same
 * figures, reached by the same URLs.
 */
export default async function OverviewPage() {
  const gate = await requireAdmin("/admin");
  if (!gate.ok) return <Forbidden email={gate.email} />;
  if (!hasServiceKey()) return <MissingServiceKey />;

  // 30 days is the only comparison the overview attempts. Shorter is too
  // jumpy for "is the product healthy"; longer hides a recent stall.
  const since = new Date(new Date().getTime() - 30 * 86_400_000);

  const [counts, recent, plans, activeByPeriod, newSignups, paymentsPending] =
    await Promise.all([
      countUsersByState(),
      listUsers({ filter: "all", sort: "joined", dir: "desc", page: 1 }),
      listPlans(),
      countActiveByPeriod(),
      countUsersSince(since),
      countPaymentsAwaitingReview(),
    ]);

  // Top five most-recently-joined users. The page already paginates 25;
  // capping here keeps the "new sign-ups" card the right size and pushes
  // the rest of the list to the Users page.
  const recentRows = recent.rows.slice(0, 5);

  // Renewals worth a nudge — same horizon the Users page uses, so the
  // numbers on the two pages cannot disagree. Capped at 5 for the card.
  const expiringRows = recent.rows
    .filter((u) => derivePremiumState(u) === "premium")
    .filter((u) => {
      const left = daysUntil(u.premium_until);
      return left !== null && left >= 0 && left <= EXPIRING_SOON_DAYS;
    })
    .slice(0, 5);

  // Four is the cap (admin §6), and the queue earns the first slot: every
  // other number here is something to know, this one is someone waiting.
  // It displaced "New in 30 days", which is why `newSignups` now reads as
  // the sign-ups card's subtitle instead of a tile of its own.
  const tiles: Kpi[] = [
    {
      key: "pending",
      label: "Payments pending",
      value: formatCount(paymentsPending),
      hint:
        paymentsPending === 0
          ? "Queue is clear"
          : "Someone has paid and is waiting",
      href: "/admin/payments",
    },
    ...userStateTiles(counts),
  ];

  return (
    <div className="container-wide py-12">
      <PageHeader
        title="Overview"
        subtitle="What is paying right now, what is about to lapse, and who signed up lately. Every figure here links to the table it came from."
      />

      <KpiGrid heading="At a glance" id="overview-kpis" tiles={tiles} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentSignupsCard rows={recentRows} newSignups={newSignups} />
        <ExpiringCard rows={expiringRows} />
      </div>

      <PlansStrip plans={plans} activeByPeriod={activeByPeriod} />
    </div>
  );
}

type UserRows = Awaited<ReturnType<typeof listUsers>>["rows"];

function RecentSignupsCard({
  rows,
  newSignups,
}: {
  rows: UserRows;
  newSignups: number;
}) {
  return (
    <TableCard
      id="recent-signups-heading"
      title="Recent sign-ups"
      meta={plural(newSignups, "in 30 days", "in 30 days")}
      action={{ href: usersHref({}), label: "All users" }}
      minWidth={420}
      flush
      empty={rows.length === 0 ? <Empty>No users have signed up yet.</Empty> : undefined}
    >
      <thead>
        <tr>
          <Th>User</Th>
          <Th>Plan</Th>
          <Th>Joined</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => (
          <Tr key={u.id} data-testid="overview-recent-row" data-user={u.id}>
            <Td>
              <Identity
                primary={u.name ?? "Unnamed"}
                secondary={
                  u.email ?? (u.is_anonymous ? "Anonymous account" : undefined)
                }
              />
            </Td>
            <Td>
              <StatusPill status={derivePremiumState(u)} />
            </Td>
            <Td className="text-ink-2">{formatDate(u.created_at)}</Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}

function ExpiringCard({ rows }: { rows: UserRows }) {
  return (
    <TableCard
      id="expiring-heading"
      // Derived from EXPIRING_SOON_DAYS, like the tile above it and the
      // filter pill on the Users page. This card used to read "Expiring this
      // week", which was only true while the constant happened to be 7.
      title={EXPIRING_LABEL}
      meta={
        rows.length === 0
          ? "Nothing to chase"
          : plural(rows.length, "renewal due", "renewals due")
      }
      action={{ href: usersHref({ status: "expiring" }), label: "All renewals" }}
      minWidth={420}
      flush
      empty={
        rows.length === 0 ? (
          <Empty>
            No premium is up for renewal in the next {EXPIRING_SOON_DAYS} days.
          </Empty>
        ) : undefined
      }
    >
      <thead>
        <tr>
          <Th>User</Th>
          <Th>Plan</Th>
          <Th>Renews</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => {
          const left = daysUntil(u.premium_until);
          return (
            <Tr key={u.id} data-testid="overview-expiring-row" data-user={u.id}>
              <Td>
                <Identity
                  primary={u.name ?? "Unnamed"}
                  secondary={
                    u.email ?? (u.is_anonymous ? "Anonymous account" : undefined)
                  }
                />
              </Td>
              <Td className="text-ink-2">{orDash(u.plan_period)}</Td>
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
            </Tr>
          );
        })}
      </tbody>
    </TableCard>
  );
}

function PlansStrip({
  plans,
  activeByPeriod,
}: {
  plans: Awaited<ReturnType<typeof listPlans>>;
  activeByPeriod: Awaited<ReturnType<typeof countActiveByPeriod>>;
}) {
  return (
    <TableCard
      id="overview-plans-heading"
      title="Plans"
      meta={plural(plans.length, "plan", "plans")}
      // One link in the header rather than an "Open" button per row: every
      // row pointed at the same page, so the column was five copies of one
      // link wearing a "Detail" heading.
      action={{ href: "/admin/plans", label: "All plans" }}
      minWidth={520}
      empty={plans.length === 0 ? <Empty>No plan is configured.</Empty> : undefined}
    >
      <thead>
        <tr>
          <Th>Plan</Th>
          <Th align="right">Subscribers</Th>
        </tr>
      </thead>
      <tbody>
        {plans.map((plan) => (
          <Tr key={plan.period} data-testid="overview-plan-row" data-plan={plan.period}>
            <Td>
              <span className="font-medium text-ink capitalize">{plan.period}</span>
              {plan.duration ? (
                <p className="text-small text-ink-3">{plan.duration}</p>
              ) : null}
            </Td>
            <Td align="right" className="text-ink">
              {formatCount(activeByPeriod[plan.period] ?? 0)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
