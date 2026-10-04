import { redirect } from "next/navigation";

/**
 * There is no public surface in this app. The root is the dashboard, and
 * /admin's own guard decides between the sign-in redirect and the forbidden
 * card.
 */
export default function Root() {
  redirect("/admin");
}
