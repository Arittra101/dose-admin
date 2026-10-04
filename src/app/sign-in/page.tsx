import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SignInForm } from "@/app/sign-in/SignInForm";
import { getSessionUser, isAdminEmail } from "@/lib/auth";

export const metadata: Metadata = {
  // The one page that had no title of its own, so it inherited the root
  // layout's and read "Dose Care — Admin" like every other tab.
  title: "Sign in — Dose Care Admin",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;

  // Only an internal path is ever honoured. An absolute URL in ?next= would
  // turn the sign-in page into an open redirect.
  const raw = typeof params.next === "string" ? params.next : "/admin";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";

  // Already signed in as an operator → nothing to do here.
  const user = await getSessionUser();
  if (user && isAdminEmail(user.email)) {
    redirect(next);
  }

  return (
    <main id="main" className="flex flex-1 items-center">
      <div className="container-page py-14">
        <div className="mx-auto max-w-md">
          <div className="card p-7">
            <SignInForm next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}
