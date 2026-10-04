import { Header } from "@/components/Header";
import { SidebarNav, SidebarNavMobile } from "@/components/SidebarNav";
import { getSessionUser } from "@/lib/auth";

/**
 * The dashboard shell.
 *
 * Header, sidebar, content. The footer is the root layout's, so it spans
 * the full width beneath both columns rather than being inset under the
 * content one.
 *
 * The sidebar is 240px wide and its rule runs the **full height of the
 * column**. Getting that right needs two elements: the `<aside>` stretches
 * (the flex default) so its border and tint reach the footer, and the sticky
 * positioning sits on the inner wrapper so the links still follow the
 * scroll. Put `sticky` and `self-start` on the aside itself and it collapses
 * to the height of four nav links, leaving a rule that stops halfway down
 * the page.
 *
 * Content uses `container-wide` (1440px) rather than `container-page`
 * (1040px): 1040 is the right measure for prose and the wrong one for a
 * dense users table. The 22px gutter is kept so content still lines up with
 * the header.
 *
 * No access check here. Each page runs `requireAdmin()` itself, because a
 * layout cannot render a per-page forbidden card and — more importantly — a
 * layout guard would not protect a route handler or server action in the
 * same segment. The guard belongs where the data is read.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();

  return (
    <>
      <Header email={user?.email} />

      {/* `flex-1` and nothing else — a min-height here would stack with the
          header and footer and guarantee a scrollbar on every page. */}
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-bg-alt/40 sm:block">
          <div className="sticky top-16 py-8">
            <SidebarNav />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-line bg-bg-alt/40 sm:hidden">
            <SidebarNavMobile />
          </div>
          <main id="main">{children}</main>
        </div>
      </div>
    </>
  );
}
