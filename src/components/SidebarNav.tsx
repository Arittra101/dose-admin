"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GridIcon, ReceiptIcon, TagIcon, UsersIcon } from "@/components/icons";

/**
 * Dashboard navigation. The active treatment reuses the filter-pill logic
 * rather than inventing a third selected-state look: accent-soft fill,
 * accent-ink text, full radius.
 *
 * Under `sm` the column becomes a horizontally scrolling pill row — the same
 * answer the dense table gives to small screens, so the two don't disagree.
 *
 * One item per route that exists — a link is a promise that the route
 * answers. Payments sits directly under Overview because it is the only
 * queue in the app: everything else here is a table you consult, that one is
 * work waiting on a person.
 */
const ITEMS = [
  { href: "/admin", label: "Overview", Icon: GridIcon },
  { href: "/admin/payments", label: "Payments", Icon: ReceiptIcon },
  { href: "/admin/users", label: "Users", Icon: UsersIcon },
  { href: "/admin/plans", label: "Plans", Icon: TagIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  // /admin is only active on exactly /admin — otherwise every child route
  // would light up two items at once.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard sections" className="space-y-1 px-3">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNavMobile() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard sections"
      className="flex gap-2 overflow-x-auto px-[var(--gutter)] py-3"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`pill h-9 shrink-0 px-4 text-[13px] ${
              active
                ? "bg-accent-soft text-accent-ink"
                : "border border-line bg-surface text-ink-2"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
