import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowDownIcon, ArrowUpIcon } from "@/components/icons";

/**
 * KPI tiles. Four max, per the guidelines, and one hero figure per view at
 * most — if all four are display size, none of them is.
 *
 * The value is set in Fraunces at 32px because the serif *is* this brand's
 * display face, and with the font's default proportional figures: tabular
 * numerals make a display-size number look gappy. (Axis ticks are the
 * opposite case — those are a column, so they get tabular-nums.)
 *
 * A delta is always signed *and* glyphed, never colour alone, and it names
 * its comparison period. `good` is the caller's judgement: more expiring
 * subscriptions is a bigger number and worse news, so direction and
 * sentiment are separate inputs.
 */
export type Kpi = {
  key: string;
  label: string;
  value: string;
  /** Pre-formatted, e.g. "+12%" or "3". Omit when there is no comparison. */
  delta?: string | null;
  good?: boolean;
  /** Names the comparison period: "vs previous 7 days". */
  deltaNote?: string;
  hint?: string;
  href?: string;
};

function TileBody({ kpi }: { kpi: Kpi }) {
  return (
    <>
      <p className="label-micro">{kpi.label}</p>
      <p className="mt-2 font-heading text-[32px] leading-none text-ink">
        {kpi.value}
      </p>
      {kpi.delta ? (
        <p
          className={`mt-2 flex items-center gap-1 text-small ${
            kpi.good ? "text-accent-ink" : "text-danger"
          }`}
        >
          {kpi.good ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
          {kpi.delta}
          {kpi.deltaNote ? (
            <span className="text-ink-3">{kpi.deltaNote}</span>
          ) : null}
        </p>
      ) : kpi.hint ? (
        <p className="mt-2 text-small text-ink-2">{kpi.hint}</p>
      ) : null}
    </>
  );
}

export function KpiTile({ kpi }: { kpi: Kpi }) {
  // A tile is only a link if the *whole* tile navigates — a link buried
  // inside a tile is a target nobody can hit.
  if (kpi.href) {
    return (
      <Link
        href={kpi.href}
        className="card block p-5 transition-colors hover:bg-bg-alt/30"
        data-testid={`kpi-${kpi.key}`}
      >
        <TileBody kpi={kpi} />
      </Link>
    );
  }

  return (
    <article className="card p-5" data-testid={`kpi-${kpi.key}`}>
      <TileBody kpi={kpi} />
    </article>
  );
}

export function KpiGrid({
  heading,
  id,
  tiles,
  children,
}: {
  heading: string;
  id: string;
  tiles: Kpi[];
  children?: ReactNode;
}) {
  return (
    <section className="mt-6" aria-labelledby={id}>
      <h2 id={id} className="sr-only">
        {heading}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} />
        ))}
      </div>
      {children}
    </section>
  );
}
