/**
 * Query-string builder for the filter/sort/search/page links.
 *
 * Every view state lives in the URL, which means every control is an <a>
 * and every one of them has to carry the *other* params through — changing
 * the sort must not silently reset the status filter or drop the search.
 * Doing that by hand at each call site is how a dashboard ends up with
 * filters that cancel each other out, so it is done here once.
 *
 * Empty strings and defaults are dropped, so the common view has a clean URL
 * worth bookmarking.
 */
export function href(
  base: string,
  params: Record<string, string | number | undefined | null>,
  defaults: Record<string, string | number> = {},
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (String(defaults[key]) === String(value)) continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Narrow a raw search param to one of a fixed literal list. */
export function oneOf<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = Array.isArray(value) ? value[0] : value;
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export function intParam(
  value: string | string[] | undefined,
  fallback: number,
  min = 1,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

export function strParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}
