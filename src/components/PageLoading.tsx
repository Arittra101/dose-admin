import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";

/**
 * The route-level loading shape: title skeleton, a lead line, `cards` card
 * skeletons, then a spinner and a wording line, all inside one
 * role="status" aria-busy region.
 *
 * Note where these boundaries go. There is deliberately **no loading.tsx at
 * the app root**: one there would also wrap the sign-in route and any
 * unmatched path, and streaming a shell commits a 200 before notFound()
 * runs — unknown paths would stop answering 404. Add a boundary per route
 * segment, never at the root.
 */
export function PageLoading({
  cards = 3,
  table = false,
  panels = 0,
}: {
  cards?: number;
  table?: boolean;
  /**
   * Record panels in a two-column grid, for a detail route. A detail page is
   * not a table, and reusing the 420px table block for it would shift the
   * layout the moment the real panels arrived.
   */
  panels?: number;
}) {
  return (
    <div
      className="container-wide py-12"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-9 w-64 rounded-full" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full max-w-[46ch] rounded-full" />
        <Skeleton className="h-3 w-full max-w-[28ch] rounded-full" />
      </div>

      {cards > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            // 104px is the real KPI tile height (label + 32px figure +
            // delta line at p-5), so the swap is silent.
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : null}

      {table ? <Skeleton className="mt-5 h-[420px]" /> : null}

      {panels > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: panels }).map((_, i) => (
            <Skeleton key={i} className="h-[260px]" />
          ))}
        </div>
      ) : null}

      <p className="mt-6 flex items-center gap-2 text-small text-ink-3">
        <Spinner size={15} />
        Loading…
      </p>
    </div>
  );
}
