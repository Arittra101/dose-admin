"use server";

import { revalidatePath } from "next/cache";

import { composeMessage, isGenerated } from "@/app/admin/payments/message";
import { assertAdmin } from "@/lib/auth";
import {
  countOpenClaimsForTrx,
  findTransaction,
  handEnteredMessage,
  recordTransaction,
} from "@/lib/db/transactions";
import { hasServiceKey } from "@/lib/supabase/admin";

/**
 * Record a bKash payment the payment app never forwarded.
 *
 * Every check here runs again on the server even though the form already
 * enforces it: a Server Action is a POST endpoint, and rendering the form
 * behind `requireAdmin()` gates the *page*, not the action. `assertAdmin()`
 * exists for exactly this — see the note on it in lib/auth.ts.
 */

export type RecordErrorReason =
  | "forbidden"
  | "no-key"
  | "trx"
  | "amount"
  | "occurred"
  | "message"
  | "duplicate"
  | "failed";

export type RecordState =
  | { status: "idle" }
  // `detail` is the database's own words. This page is already behind
  // requireAdmin(), and the operator reading it is the person who can act on
  // "column X does not exist" — collapsing that into "try again" just moves
  // the diagnosis somewhere they cannot reach.
  | { status: "error"; reason: RecordErrorReason; detail?: string }
  | { status: "done"; trxId: string; matched: number };

/** bKash transaction ids are short alphanumeric strings, no separators. */
const TRX_ID = /^[A-Z0-9]{4,32}$/;

/** No bKash personal transfer is worth more than this; a larger number is a typo. */
const MAX_AMOUNT = 1_000_000;

/** Long enough for any bKash SMS, short enough that a paste accident is caught. */
const MAX_MESSAGE = 2_000;

/**
 * `<input type="datetime-local">` submits wall-clock time with no zone.
 * The operator reading the SMS is in Dhaka, and format.ts is emphatic that
 * every timestamp in this app is Dhaka — so the offset is applied here
 * rather than letting the server's own zone decide what "14:30" meant.
 * Dhaka is UTC+6 with no DST, so this is exact, not an approximation.
 */
function dhakaLocalToIso(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const parsed = new Date(`${m[1]}T${m[2]}:00+06:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function recordTransactionAction(
  _prev: RecordState,
  formData: FormData,
): Promise<RecordState> {
  const gate = await assertAdmin();
  if (!gate.ok) return { status: "error", reason: "forbidden" };
  if (!hasServiceKey()) return { status: "error", reason: "no-key" };

  // Upper-cased because `listPendingPayments` joins claims to transactions on
  // an exact `trx_id` match. bKash prints these uppercase, so normalising
  // makes a hand entry match the forwarded one it stands in for; without it a
  // lower-case typo would insert a row that silently matches nothing.
  const trxId = String(formData.get("trx_id") ?? "").trim().toUpperCase();
  if (!TRX_ID.test(trxId)) return { status: "error", reason: "trx" };

  const amount = Number(String(formData.get("amount") ?? "").trim());
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return { status: "error", reason: "amount" };
  }

  const senderRaw = String(formData.get("sender") ?? "").trim();
  const sender = senderRaw === "" ? null : senderRaw.slice(0, 64);

  const message = String(formData.get("raw_message") ?? "").trim();
  if (message === "" || message.length > MAX_MESSAGE) {
    return { status: "error", reason: "message" };
  }

  const occurredRaw = String(formData.get("occurred_at") ?? "").trim();
  let occurredAt: string | null = null;
  if (occurredRaw !== "") {
    occurredAt = dhakaLocalToIso(occurredRaw);
    if (occurredAt === null) return { status: "error", reason: "occurred" };
  }

  // Checked before inserting so the operator gets "already recorded" rather
  // than a constraint error. recordTransaction() still handles 23505 — the
  // payment app can forward the real SMS inside this window.
  if (await findTransaction(trxId)) {
    return { status: "error", reason: "duplicate" };
  }

  // A generated message is a snapshot of the fields at the moment Generate
  // was pressed, so editing a field afterwards leaves it stating something
  // the row contradicts — "amount not recorded" beside an amount of 1338.
  // Re-derive it here from the values actually being written. Free text an
  // operator typed is never touched; deleting the marker opts out.
  const body = isGenerated(message)
    ? composeMessage({
        trxId,
        amount: String(amount),
        sender: sender ?? "",
        occurredAt: occurredRaw,
      })
    : message.replace(/\r\n/g, "\n");

  const result = await recordTransaction({
    trxId,
    amount,
    sender,
    occurredAt,
    rawMessage: handEnteredMessage(body, gate.email),
  });

  if (!result.ok) {
    if (result.reason === "duplicate") {
      return { status: "error", reason: "duplicate" };
    }
    // Also to the server log, so a failure is diagnosable from `vercel logs`
    // after the operator has closed the tab.
    console.error("recordTransaction failed", { trxId, detail: result.message });
    return { status: "error", reason: "failed", detail: result.message };
  }

  // Tells the operator whether the row they typed actually joined the queue.
  const matched = await countOpenClaimsForTrx(trxId);

  // Before returning, so the re-rendered table in this same response already
  // shows the payment against its claim (see the Server Actions guide:
  // revalidation and the new RSC payload ship in one roundtrip).
  revalidatePath("/admin/payments");

  return { status: "done", trxId, matched };
}
