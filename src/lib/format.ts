/**
 * Every number, date and amount in the dashboard goes through this file.
 *
 * Two rules worth stating because they look arbitrary:
 *
 *   - Money renders with **Latin digits**, always, even though the product is
 *     bilingual. The operator is matching these figures against a bKash
 *     statement, and bKash shows Latin digits. A Bengali-numeral amount would
 *     be correct and useless.
 *   - Dates are **always** Asia/Dhaka. The database stores timestamptz and
 *     the server may run anywhere; a payment made at 1am Dhaka must not show
 *     as the previous day because Vercel scheduled the render in us-east.
 *     Never call toLocaleString at a call site.
 */

export const DHAKA = "Asia/Dhaka";
const LOCALE = "en-GB";

const bdt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** `৳ 1,234`, or `৳ —` for an unknown amount. 0 is a real value: `৳ 0`. */
export function formatBdt(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "৳ —";
  }
  return `৳ ${bdt.format(amount)}`;
}

/** Bare grouped number, for counts in a KPI tile. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return bdt.format(n);
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeZone: DHAKA,
});

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: DHAKA,
});

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  timeZone: DHAKA,
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : "—";
}

/** Axis ticks and chart labels: `04 Oct`. */
export function formatDay(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? dayFmt.format(d) : "—";
}

/**
 * "2 hours ago" / "in 3 days". Used beside an absolute date, never instead
 * of one — an operator reconciling a statement needs the real timestamp.
 */
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const d = toDate(value);
  if (!d) return "—";

  const seconds = (d.getTime() - now.getTime()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(Math.round(seconds), "second");
}

/** ICU-style plurals without the i18n runtime: `1 payment` / `3 payments`. */
export function plural(count: number, one: string, other: string): string {
  return `${formatCount(count)} ${count === 1 ? one : other}`;
}

/** The `—` used for an unknown value. 0, "" and false are not unknown. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Calendar day boundaries in Dhaka, returned as ISO instants for a
 * timestamptz comparison. `dayStartDhaka(0)` is midnight tonight-past, i.e.
 * the start of today in Dhaka.
 */
export function dhakaDayStart(daysAgo = 0, now: Date = new Date()): Date {
  // Dhaka is UTC+6 with no DST, so a fixed offset is exact here — not an
  // approximation we are tolerating.
  const offsetMs = 6 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + offsetMs);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo);
  return new Date(shifted.getTime() - offsetMs);
}

/** `YYYY-MM-DD` for the Dhaka calendar day a timestamp falls in. */
export function dhakaDayKey(value: string | Date): string {
  const d = toDate(value);
  if (!d) return "";
  const shifted = new Date(d.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}
