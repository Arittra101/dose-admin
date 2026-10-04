/**
 * The one strip of chrome below the content: copyright and a contact address.
 *
 * It lives in the root layout rather than the dashboard shell so the sign-in
 * page carries it too — an operator who cannot get in is exactly the person
 * who needs the contact address, and it would be absent from the only screen
 * they can reach if this sat under /admin.
 *
 * `container-wide` and the 22px gutter are the same ones the header uses, so
 * the copyright lines up with the brand mark directly above it.
 */
export function Footer() {
  // Rendered per request on the dashboard routes, which are all dynamic. The
  // two static routes (`/`, which only redirects, and the 404) bake it at
  // build time — neither shows a year anyone reads.
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="container-wide flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5">
        <p className="text-small text-ink-3">
          © {year} Dose Care. All rights reserved.
        </p>
        <p className="text-small text-ink-3">
          <a
            href="mailto:think.tank9t@gmail.com"
            className="text-accent-ink underline-offset-2 hover:underline"
          >
            think.tank9t@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
