import type { ReactNode } from "react";

/**
 * Title, one line of instruction, and at most one page-level action on the
 * same line. No breadcrumb, no avatar row, no action bar — the data is the
 * interface.
 *
 * The subtitle is operational, not marketing: it tells the operator what to
 * check. `flex-wrap` and `gap-4` are not optional.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[30px] sm:text-[34px]">{title}</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** The section eyebrow. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label-micro">{children}</p>;
}
