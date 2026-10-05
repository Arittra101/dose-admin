"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";

import { composeMessage } from "@/app/admin/payments/message";
import {
  recordTransactionAction,
  type RecordErrorReason,
  type RecordState,
} from "@/app/admin/payments/actions";
import { Spinner } from "@/components/Spinner";

/**
 * The manual fallback for a payment the app never forwarded.
 *
 * This is the only form in the dashboard that writes, so it says plainly what
 * it is for and stays out of the way until it is needed. The "Record it" link
 * on an unmatched row fills in the transaction id *and* the claim's amount:
 * `resolve_pending_claim()` approves a claim only when the two amounts match
 * exactly and the figure is an active plan price, so neither is worth
 * retyping.
 */

const COPY: Record<RecordErrorReason, string> = {
  forbidden: "Your session is no longer an operator session. Sign in again.",
  "no-key": "The service key is missing, so the dashboard cannot write.",
  trx: "A transaction id is 4–32 letters and digits, no spaces.",
  amount: "Enter the amount that arrived, as a number greater than zero.",
  occurred: "That date and time could not be read.",
  message: "Paste the bKash message, or type what the statement shows.",
  duplicate: "A payment with this transaction id is already recorded.",
  failed: "Could not record it. Try again in a moment.",
};

export function RecordTransactionForm({
  defaultTrxId,
  defaultAmount,
  planAmounts,
}: {
  defaultTrxId?: string;
  defaultAmount?: string;
  /** Active plan prices. An amount outside this set is auto-rejected. */
  planAmounts: number[];
}) {
  const [state, action, pending] = useActionState<RecordState, FormData>(
    recordTransactionAction,
    { status: "idle" },
  );

  // Clearing the form after a success, and re-applying a new prefill, are the
  // same operation: throw the fields away and mount fresh ones. Keying them
  // does that without a setState-in-effect cascade, and it is why every
  // field — and the submit button that reads them — lives in one component.
  const seed =
    state.status === "done"
      ? `done:${state.trxId}`
      : `pre:${defaultTrxId ?? ""}:${defaultAmount ?? ""}`;
  const recorded = state.status === "done";

  return (
    <section
      id="record-transaction"
      aria-labelledby="record-transaction-heading"
      className="card mt-6 p-6"
    >
      <h2 id="record-transaction-heading" className="font-heading text-[19px] text-ink">
        Record a payment by hand
      </h2>
      <p className="mt-1 max-w-[70ch] text-ink-2">
        Use this only when the money is in the bKash statement but the payment
        app never forwarded the message — a phone that was off or out of
        credit. It writes the same row the app would have written, so the
        claim quoting this id stops reading{" "}
        <span className="text-danger">No payment found</span>.
      </p>

      <form action={action} aria-busy={pending} className="mt-5">
        <RecordFields
          key={seed}
          defaultTrxId={recorded ? undefined : defaultTrxId}
          defaultAmount={recorded ? undefined : defaultAmount}
          planAmounts={planAmounts}
          pending={pending}
          status={
            <>
              {state.status === "error" ? (
                <p
                  role="alert"
                  className="text-[13px] text-danger"
                  data-testid="record-error"
                >
                  {COPY[state.reason]}
                  {state.detail ? (
                    <span className="mt-1 block font-mono text-[12px] text-ink-3">
                      {state.detail}
                    </span>
                  ) : null}
                </p>
              ) : null}

              {state.status === "done" ? (
                <p
                  role="status"
                  // A recorded payment that matches nothing is the typo case,
                  // and it is the one an operator must not scroll past — so it
                  // reads as a warning, not a tick.
                  className={
                    state.matched === 0
                      ? "text-[13px] text-warn"
                      : "text-[13px] text-accent-ink"
                  }
                  data-testid="record-done"
                >
                  {state.matched === 0
                    ? `Recorded ${state.trxId}, but no pending claim quotes that id — check it against the statement.`
                    : `Recorded ${state.trxId}. ${
                        state.matched === 1
                          ? "1 pending claim now shows this payment."
                          : `${state.matched} pending claims now show this payment.`
                      }`}
                </p>
              ) : null}
            </>
          }
        />
      </form>
    </section>
  );
}

function RecordFields({
  defaultTrxId,
  defaultAmount,
  planAmounts,
  pending,
  status,
}: {
  defaultTrxId?: string;
  defaultAmount?: string;
  planAmounts: number[];
  pending: boolean;
  status: ReactNode;
}) {
  const [trxId, setTrxId] = useState(defaultTrxId ?? "");
  const [amount, setAmount] = useState(defaultAmount ?? "");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // resolve_pending_claim() looks the paid amount up in `plans`; anything
  // else is rejected as NOT_A_PLAN_PRICE and the user never gets premium.
  // Saying so before the write is the difference between a visible warning
  // and a claim that dies silently inside a trigger.
  const offPrice =
    amount !== "" &&
    Number.isFinite(Number(amount)) &&
    planAmounts.length > 0 &&
    !planAmounts.includes(Number(amount));

  // Every required field, checked with the same rules the action applies.
  // `required` already blocks an empty submit, but a button that cannot work
  // should not look like it can — and a rule enforced only on the server
  // costs a round trip to discover. Both still run server-side: the action is
  // a POST endpoint reachable without this UI.
  const trxClean = trxId.trim().toUpperCase();
  const trxBad = trxClean !== "" && !/^[A-Z0-9]{4,32}$/.test(trxClean);

  const amountNum = Number(amount);
  const amountBad =
    amount.trim() !== "" && (!Number.isFinite(amountNum) || amountNum <= 0);

  const missing = [
    trxClean === "" ? "transaction id" : null,
    amount.trim() === "" ? "amount" : null,
    message.trim() === "" ? "bKash message" : null,
  ].filter((field): field is string => field !== null);

  const blocked = missing.length > 0 || trxBad || amountBad;

  // One line, naming the specific thing in the way — "fill in the form" tells
  // an operator nothing they did not already know.
  const blockedBecause = trxBad
    ? "A transaction id is 4–32 letters and digits, no spaces."
    : amountBad
      ? "The amount must be a number greater than zero."
      : missing.length === 1
        ? `Add the ${missing[0]}.`
        : missing.length > 1
          ? `Add the ${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}.`
          : null;

  function generate() {
    // The textarea's own form — no ref to thread down from the parent.
    const form = messageRef.current?.form;
    if (!form) return;

    const data = new FormData(form);
    const read = (name: string) => String(data.get(name) ?? "").trim();

    setMessage(
      composeMessage({
        trxId: read("trx_id"),
        amount: read("amount"),
        sender: read("sender"),
        occurredAt: read("occurred_at"),
      }),
    );
    // Leave the operator in the field they will want to correct.
    messageRef.current?.focus();
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="trx_id" className="label-micro block">
            Transaction id
          </label>
          <input
            id="trx_id"
            name="trx_id"
            required
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="9H5K2L7M1P"
            // Same treatment the table gives it: read one character at a
            // time against a statement.
            className="field mt-2 font-mono tracking-wider uppercase"
            data-testid="record-trx-id"
          />
          {trxBad ? (
            <p className="mt-1 text-small text-danger" data-testid="record-trx-bad">
              Letters and digits only, 4–32 of them.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="amount" className="label-micro block">
            Amount (৳)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min="1"
            step="0.01"
            inputMode="decimal"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field mt-2"
            data-testid="record-amount"
          />
          {amountBad ? (
            <p className="mt-1 text-small text-danger" data-testid="record-amount-bad">
              Must be a number greater than zero.
            </p>
          ) : null}
          {offPrice ? (
            <p className="mt-1 text-small text-warn" data-testid="record-off-price">
              Not an active plan price ({planAmounts.join(", ")}). The claim
              will be rejected as NOT_A_PLAN_PRICE and no premium granted.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="sender" className="label-micro block">
            Sender <span className="text-ink-3">(optional)</span>
          </label>
          <input
            id="sender"
            name="sender"
            autoComplete="off"
            placeholder="01XXXXXXXXX"
            className="field mt-2 font-mono"
            data-testid="record-sender"
          />
        </div>

        <div>
          <label htmlFor="occurred_at" className="label-micro block">
            Paid at <span className="text-ink-3">(optional)</span>
          </label>
          <input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            className="field mt-2"
            data-testid="record-occurred-at"
          />
          <p className="mt-1 text-small text-ink-3">Dhaka time, as the SMS shows it.</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="raw_message" className="label-micro block">
            bKash message
          </label>
          {/* type="button" — inside a <form action>, the default submits. */}
          <button
            type="button"
            onClick={generate}
            className="btn btn-secondary btn-sm"
            data-testid="record-generate"
          >
            Generate from fields
          </button>
        </div>
        <textarea
          id="raw_message"
          name="raw_message"
          ref={messageRef}
          required
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="You have received Tk 500.00 from 01XXXXXXXXX. Ref 1. Fee Tk 0.00. Balance Tk 1,234.00. TrxID HSNDJDKSB at 05/10/2026 10:31"
          className="field mt-2 font-mono text-[13px]"
          data-testid="record-raw-message"
        />
        <p className="mt-1 text-small text-ink-3">
          The evidence this row stands on — paste the SMS if you have it. If no
          message exists, fill the fields above and press Generate: it records
          that you confirmed the payment yourself, rather than imitating a
          message that never arrived. Saved with your name against it either
          way.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || blocked}
          // `disabled` alone is silent to someone who cannot see the greyed
          // button, so say why it is off.
          aria-describedby={blocked ? "record-submit-blocked" : undefined}
          className="btn btn-primary"
          data-testid="record-submit"
        >
          {pending ? <Spinner size={15} /> : null}
          {pending ? "Recording…" : "Record payment"}
        </button>

        {blockedBecause ? (
          <p id="record-submit-blocked" className="text-[13px] text-ink-3">
            {blockedBecause}
            {missing.includes("bKash message") ? " Or press Generate." : null}
          </p>
        ) : null}

        {status}
      </div>
    </>
  );
}
