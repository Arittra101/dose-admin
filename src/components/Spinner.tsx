/**
 * aria-hidden by design: the thing that *started* the work owns the wording.
 * A spinner that announced itself would double up with the `aria-busy`
 * region and the "Working…" label on the button that triggered it.
 *
 * Under prefers-reduced-motion it slows to 2s rather than stopping — it is
 * the only proof that work is still running (see globals.css).
 */
export function Spinner({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
