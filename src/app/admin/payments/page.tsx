import Link from "next/link";
import type { Metadata } from "next";

import { RecordTransactionForm } from "@/app/admin/payments/RecordTransactionForm";
import { FilterPill, FilterRow, Pagination, SearchForm } from "@/components/Filters";
import { Forbidden, MissingServiceKey } from "@/components/Forbidden";
import { KpiGrid, type Kpi } from "@/components/Kpi";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Dash, Empty, Identity, TableCard, Td, Th, Tr } from "@/components/Table";
import { requireAdmin } from "@/lib/auth";
import {
  PAYMENTS_PAGE_SIZE,
  PAYMENT_FILTERS,
  countPendingPayments,
  listPendingPayments,
  type PaymentFilter,
  type PendingPayment,
} from "@/lib/db/payments";
import { listPlans } from "@/lib/db/plans";
import { hasServiceKey } from "@/lib/supabase/admin";
import { formatBdt, formatCount, formatDate, formatDateTime, plural } from "@/lib/format";
import { href, intParam, oneOf, strParam } from "@/lib/url";

export const metadata: Metadata = {
  // See the note on the overview: `robots` comes from the root layout.
  title: "Payments — Dose Care Admin",
};

const FILTER_LABELS: Record<PaymentFilter, string> = {
  pending: "Pending",
  resolved: "Resolved",
  all: "All",
};

const BASE = "/admin/payments";

// Unlike the users table, the default here is *not* "all". This page is a
// work queue — every pending payment is a person who has sent money and is
// waiting — so it opens on the subset that still needs someone, per admin §5.
const DEFAULTS = { status: "pending", dir: "desc" };

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/admin/payments">) {
  const gate = await requireAdmin("/admin/payments");
  if (!gate.ok) return <Forbidden email={gate.email} />;
  if (!hasServiceKey()) return <MissingServiceKey />;

  const params = await searchParams;

  const filter = oneOf<PaymentFilter>(params.status, PAYMENT_FILTERS, "pending");
  const dir = oneOf(params.dir, ["asc", "desc"] as const, "desc");
  const page = intParam(params.page, 1);
  const q = strParam(params.q);
  // Set by the "Record it" link on an unmatched row, so the id an operator
  // must not retype arrives in the form already filled in.
  const prefillTrx = strParam(params.record);
  // The trigger requires transactions.amount = pending_claims.amount exactly,
  // so the claim's own figure is carried across rather than retyped.
  const prefillAmount = strParam(params.amount);

  const [counts, result, plans] = await Promise.all([
    countPendingPayments(),
    listPendingPayments({ filter, dir, page, q }),
    // resolve_pending_claim() approves a claim only when the paid amount is
    // an active plan price, so the form needs the prices to warn before an
    // operator records a row the trigger will reject as NOT_A_PLAN_PRICE.
    listPlans(),
  ]);

  const planAmounts = plans
    .filter((plan) => plan.is_active && plan.amount !== null)
    .map((plan) => Number(plan.amount));

  const carry = { status: filter, dir, q };
  const linkTo = (next: Record<string, string | number | undefined | null>) =>
    href(BASE, next, DEFAULTS);

  // How many rows on this page quote a transaction id that never arrived.
  // This is the number that decides whether the queue is a morning's work or
  // a problem.
  const unmatched = result.rows.filter(
    (r) => r.transaction === null && r.claim.resolved_at === null,
  ).length;

  const tiles: Kpi[] = [
    {
      key: "pending",
      label: "Payments pending",
      value: formatCount(counts.pending),
      hint: counts.pending === 0 ? "Queue is clear" : "Someone is waiting",
      href: linkTo({ status: "pending" }),
    },
    {
      key: "unmatched",
      label: "No payment found",
      value: formatCount(unmatched),
      hint:
        unmatched === 0
          ? "Every row on this page matches"
          : "On this page — check before granting",
    },
    {
      key: "resolved",
      label: "Resolved",
      value: formatCount(counts.resolved),
      hint: "Already decided",
      href: linkTo({ status: "resolved" }),
    },
    {
      key: "total",
      label: "Submitted all time",
      value: formatCount(counts.all),
      href: linkTo({ status: "all" }),
    },
  ];

  return (
    <div className="container-wide py-12">
      <PageHeader
        title="Payments"
        subtitle="Match each transaction id against the bKash statement before granting premium. A row with no matching payment is the one to stop on."
      />

      <KpiGrid heading="Payment totals" id="payment-kpis" tiles={tiles} />

      <FilterRow label="Filter payments" count={plural(result.total, "payment", "payments")}>
        {PAYMENT_FILTERS.map((f) => (
          <FilterPill
            key={f}
            href={linkTo({ ...carry, status: f, page: 1 })}
            active={f === filter}
          >
            {FILTER_LABELS[f]}
          </FilterPill>
        ))}
        <SearchForm
          action={BASE}
          defaultValue={q}
          placeholder="Transaction id"
          hidden={{
            status: filter === DEFAULTS.status ? undefined : filter,
            dir: dir === DEFAULTS.dir ? undefined : dir,
          }}
        />
      </FilterRow>

      <TableCard
        minWidth={1040}
        empty={
          result.rows.length === 0 ? (
            <Empty>
              {q
                ? `No payment quotes a transaction id matching “${q}”.`
                : filter === "pending"
                  ? "Nothing is pending. The queue is clear."
                  : "No payment in this group."}
            </Empty>
          ) : undefined
        }
      >
        <thead>
          <tr>
            <Th>Paid by</Th>
            <Th>Transaction id</Th>
            <Th>Claimed</Th>
            <Th>Payment received</Th>
            <Th>Status</Th>
            <Th
              sort={{
                dir,
                href: linkTo({
                  ...carry,
                  dir: dir === "desc" ? "asc" : "desc",
                  page: 1,
                }),
              }}
            >
              Submitted
            </Th>
            <Th align="right">Detail</Th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <PaymentRow
              key={row.claim.id}
              row={row}
              recordHref={`${linkTo({
                ...carry,
                page,
                record: row.claim.trx_id,
                amount: row.claim.amount ?? undefined,
              })}#record-transaction`}
            />
          ))}
        </tbody>
      </TableCard>

      <Pagination
        page={page}
        pageSize={PAYMENTS_PAGE_SIZE}
        total={result.total}
        hrefFor={(p) => linkTo({ ...carry, page: p })}
      />

      <RecordTransactionForm
        defaultTrxId={prefillTrx || undefined}
        defaultAmount={prefillAmount || undefined}
        planAmounts={planAmounts}
      />
    </div>
  );
}

function PaymentRow({
  row,
  recordHref,
}: {
  row: PendingPayment;
  recordHref: string;
}) {
  const { claim, user, transaction } = row;
  const pending = claim.resolved_at === null;

  // The two amounts are compared, not just displayed: a claim for more than
  // the money that arrived is the quiet failure this page exists to catch.
  const claimed = claim.amount === null ? null : Number(claim.amount);
  const paid = transaction?.amount == null ? null : Number(transaction.amount);
  const mismatch = claimed !== null && paid !== null && claimed !== paid;

  return (
    <Tr
      data-testid="payment-row"
      data-claim={claim.id}
      data-trx={claim.trx_id}
      data-matched={transaction ? "yes" : "no"}
    >
      <Td>
        {user ? (
          <Identity
            primary={user.name ?? "Unnamed"}
            secondary={
              user.email ?? (user.is_anonymous ? "Anonymous account" : undefined)
            }
            tertiary={
              <span className="font-mono text-[12px]">{claim.user_id.slice(0, 8)}</span>
            }
          />
        ) : (
          // `user_id` is a foreign key, so this means the row was deleted out
          // from under the payment — worth saying, not hiding.
          <Identity
            primary="User not found"
            secondary="References a deleted account"
            tertiary={
              <span className="font-mono text-[12px]">{claim.user_id.slice(0, 8)}</span>
            }
          />
        )}
      </Td>

      {/* Exact value an operator reads one character at a time against a
          statement: mono plus wider tracking, per admin §8. */}
      <Td>
        <span className="font-mono text-[13px] tracking-wider text-ink">
          {claim.trx_id}
        </span>
      </Td>

      <Td>
        <span className="font-heading text-[17px] text-ink">{formatBdt(claimed)}</span>
      </Td>

      <Td>
        {transaction ? (
          <>
            <p className={mismatch ? "font-medium text-warn" : "text-ink-2"}>
              {formatBdt(paid)}
              {mismatch ? " — differs" : null}
            </p>
            {transaction.sender ? (
              <p className="font-mono text-[12px] text-ink-3">{transaction.sender}</p>
            ) : null}
            <p className="text-small text-ink-3">
              {formatDate(transaction.occurred_at ?? transaction.received_at)}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-danger">No payment found</p>
            {/* Only while the claim is open. A resolved claim with no
                transaction is history, and back-filling it would change the
                record of a decision already made. */}
            {pending ? (
              <Link
                href={recordHref}
                className="mt-1 inline-block text-small text-accent-ink underline underline-offset-2"
                data-testid="record-link"
              >
                Record it
              </Link>
            ) : null}
          </>
        )}
      </Td>

      <Td>
        {/* The database's own word for it. StatusPill maps what it knows and
            renders anything else legibly rather than blanking the cell. */}
        <StatusPill status={claim.status} />
        {claim.reason ? (
          <p className="mt-1 max-w-[26ch] text-small text-ink-3">“{claim.reason}”</p>
        ) : null}
        {!pending && claim.resolved_at ? (
          <p className="text-small text-ink-3">
            Resolved {formatDate(claim.resolved_at)}
          </p>
        ) : null}
      </Td>

      <Td className="text-ink-2">
        {/* Time of day matters here: two submissions minutes apart on one trx
            id is a duplicate, which the date alone would hide. */}
        {formatDateTime(claim.created_at)}
      </Td>

      <Td align="right">
        {user ? (
          <Link href={`/admin/users/${user.id}`} className="btn btn-secondary btn-sm">
            Open
          </Link>
        ) : (
          <Dash />
        )}
      </Td>
    </Tr>
  );
}
