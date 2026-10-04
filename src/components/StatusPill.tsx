import { Sparkle } from "@/components/icons";

/**
 * The status vocabulary, fixed. A status or badge is always `bg-*-soft` plus
 * the matching ink — never a saturated fill behind small text.
 *
 * Three families only:
 *   warn    → there is work to do (pending)
 *   accent  → settled affirmatively (verified, premium)
 *   danger  → settled negatively (rejected, failed, refunded)
 *
 * `free` and `expired` are the one deliberate exception: they are the
 * *absence* of a status, so they get the neutral page-alt fill rather than
 * borrowing a state colour. Giving "free" a danger tint would tell an
 * operator that a non-paying user is a problem to fix.
 */
const FAMILIES = {
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent-ink",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-bg-alt/70 text-ink-2",
} as const;

const MAP: Record<string, { family: keyof typeof FAMILIES; label: string }> = {
  pending: { family: "warn", label: "Pending" },
  processing: { family: "warn", label: "Processing" },
  submitted: { family: "warn", label: "Submitted" },

  verified: { family: "accent", label: "Verified" },
  completed: { family: "accent", label: "Completed" },
  success: { family: "accent", label: "Success" },
  approved: { family: "accent", label: "Approved" },
  active: { family: "accent", label: "Active" },
  premium: { family: "accent", label: "Premium" },

  rejected: { family: "danger", label: "Rejected" },
  failed: { family: "danger", label: "Failed" },
  cancelled: { family: "danger", label: "Cancelled" },
  canceled: { family: "danger", label: "Cancelled" },
  refunded: { family: "danger", label: "Refunded" },

  free: { family: "neutral", label: "Free" },
  expired: { family: "neutral", label: "Expired" },
  none: { family: "neutral", label: "—" },
};

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function StatusPill({
  status,
  className = "",
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const key = (status ?? "none").toLowerCase();
  // An unmapped status must still render legibly rather than disappearing —
  // a new enum value added to the database is an operational surprise, not a
  // reason to show a blank cell.
  const entry = MAP[key] ?? { family: "neutral" as const, label: titleCase(key) };
  const isPremium = key === "premium" || key === "active";

  return (
    <span
      className={`pill ${FAMILIES[entry.family]} ${className}`}
      data-status={key}
    >
      {isPremium ? <Sparkle size={11} /> : null}
      {entry.label}
    </span>
  );
}
