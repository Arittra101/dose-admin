/**
 * The generated `raw_message` for a hand-recorded payment.
 *
 * Shared by the form (which offers it) and the action (which re-derives it),
 * and deliberately NOT in actions.ts — a "use server" module may only export
 * async functions, so a constant living there would not compile.
 *
 * It does not imitate a bKash SMS. A generated string in that shape would be
 * indistinguishable from one the payment app actually observed, and
 * `raw_message` is the evidence every claim is settled against.
 */

/** First token of a generated message. Greppable, and how the action knows to re-derive. */
export const GENERATED_MARK = "[operator-confirmed]";

export type MessageFacts = {
  trxId: string;
  /** Empty string when not supplied — rendered as "not recorded", never guessed. */
  amount: string;
  sender: string;
  /** Dhaka wall time as typed, `YYYY-MM-DDTHH:MM`. */
  occurredAt: string;
};

export function composeMessage(facts: MessageFacts): string {
  const amount = Number(facts.amount);
  const parts = [
    `TrxID ${facts.trxId.toUpperCase()}`,
    // `Number("")` is 0, so the blank field is excluded explicitly —
    // otherwise an empty amount generates a confident "Tk 0.00".
    facts.amount !== "" && Number.isFinite(amount)
      ? `Tk ${amount.toFixed(2)}`
      : "amount not recorded",
    facts.sender ? `from ${facts.sender}` : "sender not recorded",
    facts.occurredAt
      ? `paid ${facts.occurredAt.replace("T", " ")} (Dhaka)`
      : "time not recorded",
  ];

  return [
    `${GENERATED_MARK} No bKash SMS reached the system for this payment.`,
    "Operator confirmed it against the bKash statement.",
    parts.join(" · "),
  ].join("\n");
}

export function isGenerated(message: string): boolean {
  return message.trimStart().startsWith(GENERATED_MARK);
}
