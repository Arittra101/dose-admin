import Link from "next/link";

import { signOut } from "@/app/auth-actions";
import { Sparkle, SignOutIcon } from "@/components/icons";

/**
 * The 64px sticky bar, carrying the brand mark and the signed-in operator.
 *
 * The brand mark links to /admin because in this app that *is* the home
 * route — there is no public site here to return to. What the bar does not
 * carry is section navigation: that lives in the sidebar inside the shell,
 * so there is exactly one place a route is listed.
 *
 * The skip link is the first child and targets #main. Keep it there.
 */
export function Header({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-line bg-bg/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-small focus:text-accent-ink"
      >
        Skip to content
      </a>

      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-ink transition-colors hover:text-accent-ink"
        >
          <Sparkle size={16} className="text-accent" />
          <span className="font-heading text-[19px] tracking-[-0.3px]">
            Dose Care
          </span>
          <span className="label-micro mt-px hidden sm:block">Admin</span>
        </Link>

        {email ? (
          <div className="flex min-w-0 items-center gap-3">
            {/* min-w-0 + truncate: an operator's address can be long, and the
                header must not grow a horizontal scrollbar at 360px. */}
            <span className="hidden min-w-0 truncate text-small text-ink-2 sm:block">
              {email}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn btn-secondary btn-sm">
                <SignOutIcon size={14} />
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
