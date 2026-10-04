import type { Metadata } from "next";

import { Forbidden, MissingServiceKey } from "@/components/Forbidden";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Empty, TableCard, Td, Th, Tr } from "@/components/Table";
import { requireAdmin } from "@/lib/auth";
import { countActiveByPeriod, listPlans } from "@/lib/db/plans";
import { hasServiceKey } from "@/lib/supabase/admin";
import { formatBdt, formatCount, orDash } from "@/lib/format";

export const metadata: Metadata = {
  // See the note on the overview: `robots` comes from the root layout.
  title: "Plans — Dose Care Admin",
};

export default async function PlansPage() {
  const gate = await requireAdmin("/admin/plans");
  if (!gate.ok) return <Forbidden email={gate.email} />;
  if (!hasServiceKey()) return <MissingServiceKey />;

  const [plans, activeByPeriod] = await Promise.all([
    listPlans(),
    countActiveByPeriod(),
  ]);

  return (
    <div className="container-wide py-12">
      <PageHeader
        title="Plans"
        subtitle="What the client offers and what it charges. Amounts here are what claim_premium bills against, so a mismatch with the bKash statement starts in this table."
      />

      <TableCard
        minWidth={720}
        empty={plans.length === 0 ? <Empty>No plan is configured.</Empty> : undefined}
      >
        <thead>
          <tr>
            <Th>Period</Th>
            <Th>Price</Th>
            <Th>Duration</Th>
            <Th>Offered</Th>
            <Th align="right">Subscribers now</Th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <Tr key={plan.period} data-testid="plan-row" data-plan={plan.period}>
              <Td>
                <span className="font-medium text-ink capitalize">
                  {plan.period}
                </span>
              </Td>
              {/* Money always through formatBdt, Latin digits, no decimals. */}
              <Td>
                <span className="font-heading text-[18px] text-ink">
                  {formatBdt(plan.amount)}
                </span>
              </Td>
              <Td className="text-ink-2">{orDash(plan.duration)}</Td>
              <Td>
                <StatusPill status={plan.is_active ? "active" : "none"} />
              </Td>
              <Td align="right" className="text-ink">
                {formatCount(activeByPeriod[plan.period] ?? 0)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>

      {/* Rows are ordered by amount, so a cheaper long plan sorts above a
          dearer short one — the note explains why the table has no stable id
          to order by instead, and what that costs. */}
      <div className="mt-5 max-w-xl rounded-2xl bg-bg-alt/70 p-4">
        <p className="label-micro">Note</p>
        <p className="mt-2 text-small text-ink-2">
          Plan rows are keyed by <span className="font-mono">period</span> and
          have no surrogate id, so a price change edits the row in place — past
          transactions keep whatever amount they were charged, not whatever
          this table says today.
        </p>
      </div>
    </div>
  );
}
