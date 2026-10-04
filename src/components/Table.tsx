import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Table frame and cells, exactly as specced.
 *
 * The card clips and scrolls; the table declares its own min-width so
 * columns never crush. Horizontal scroll is the accepted mobile behaviour
 * for a dense admin table — the card edge is what makes it discoverable.
 * Body text drops one step to 14px for density and no further.
 *
 * No zebra striping and no row hover fill: `border-b border-line
 * last:border-b-0` is the whole row separation system.
 */
export function TableCard({
  minWidth = 860,
  title,
  id,
  meta,
  action,
  empty,
  flush = false,
  children,
  className = "",
}: {
  minWidth?: number;
  /**
   * Optional header strip. Every card that carries one carries the same one —
   * `label-micro` heading on the left, a count or status on the right, and at
   * most one link. Hand-rolling this per card is how the overview ended up
   * with three table cards that framed their contents three different ways.
   */
  title?: string;
  /** Required with `title`: the id `aria-labelledby` points at. */
  id?: string;
  meta?: ReactNode;
  action?: { href: string; label: string };
  /** Rendered instead of the table when there is nothing. */
  empty?: ReactNode;
  /**
   * Drops the default top margin, for a card whose parent already owns the
   * spacing (a `gap` grid). This is a prop and not a `mt-0` in `className`
   * because Tailwind emits `.mt-0` *before* `.mt-5`, so the override would
   * lose on source order no matter which way round the strings were written.
   */
  flush?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const margin = flush ? "" : "mt-5";

  const body = empty ?? (
    <table
      className="w-full border-collapse text-[14px]"
      style={{ minWidth: `${minWidth}px` }}
    >
      {children}
    </table>
  );

  if (!title) {
    return (
      <div className={`card ${margin} overflow-x-auto ${className}`}>{body}</div>
    );
  }

  return (
    <section
      aria-labelledby={id}
      className={`card ${margin} overflow-hidden ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line bg-bg-alt/60 px-4 py-3">
        <h2 id={id} className="label-micro">
          {title}
        </h2>
        <span className="flex items-baseline gap-3">
          {meta ? <span className="text-small text-ink-3">{meta}</span> : null}
          {action ? (
            <Link
              href={action.href}
              className="text-small text-accent-ink underline-offset-2 hover:underline"
            >
              {action.label}
            </Link>
          ) : null}
        </span>
      </div>
      <div className="overflow-x-auto">{body}</div>
    </section>
  );
}

/**
 * `label-micro` on a `<th>` is the table-header treatment across the app.
 *
 * No `sticky` here. The spec asks for `sticky top-16` so a long table's
 * header sits under the 64px bar, but the frame above is `overflow-x-auto`,
 * and CSS computes the other axis to `auto` as soon as one axis is not
 * `visible`. That makes the card itself the scrollport, and since the card has
 * no height cap the page scrolls while the card never does — so a sticky
 * header has nothing to stick through and the classes were inert. Restoring
 * the behaviour means capping the card's height, which is a layout decision,
 * not a class to re-add here.
 */
export function Th({
  children,
  className = "",
  align = "left",
  sort,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  sort?: {
    /** Current direction for this column, or null when not sorted by it. */
    dir: "asc" | "desc" | null;
    href: string;
  };
}) {
  const ariaSort = sort
    ? sort.dir === "asc"
      ? "ascending"
      : sort.dir === "desc"
        ? "descending"
        : "none"
    : undefined;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`label-micro border-b border-line bg-bg-alt/60 px-4 py-3 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {sort ? (
        <Link
          href={sort.href}
          className="inline-flex items-center gap-1 text-ink-3 transition-colors hover:text-ink-2"
        >
          {children}
          {/* The arrow stays in --ink-3: it is chrome, not data. */}
          <span aria-hidden className="text-ink-3">
            {sort.dir === "asc" ? "↑" : sort.dir === "desc" ? "↓" : "↕"}
          </span>
        </Link>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({
  children,
  className = "",
  align = "left",
  mono = false,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : ""} ${
        mono ? "font-mono" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** `align-top`, because a cell may hold three stacked lines. */
export function Tr({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-line align-top last:border-b-0 ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

/**
 * Identity cells stack: primary in medium ink, secondary small in ink-2,
 * tertiary small in ink-3. `min-w-0 truncate` on anything holding a name or
 * an email.
 */
export function Identity({
  primary,
  secondary,
  tertiary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-ink">{primary}</p>
      {secondary ? (
        <p className="truncate text-small text-ink-2">{secondary}</p>
      ) : null}
      {tertiary ? (
        <p className="truncate text-small text-ink-3">{tertiary}</p>
      ) : null}
    </div>
  );
}

/** Empty is not an error and should not look like one. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="p-6 text-ink-2">{children}</p>;
}

/** The `—` for a missing value. In --ink-3, which is fine for a dash. */
export function Dash() {
  return <span className="text-ink-3">—</span>;
}
