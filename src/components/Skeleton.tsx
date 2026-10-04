/**
 * A skeleton has the *same dimensions* as the real content, so nothing
 * jumps when the data arrives. Shape it with height/width utilities to match
 * what will replace it — a skeleton that is merely "a grey box" buys a
 * layout shift instead of preventing one.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function SkeletonText({
  lines = 2,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          // Last line short, like real ragged text.
          className={`h-3 rounded-full ${i === lines - 1 ? "w-2/5" : "w-4/5"}`}
        />
      ))}
    </div>
  );
}
