import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Forbidden, MissingServiceKey } from "@/components/Forbidden";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Dash } from "@/components/Table";
import { ArrowLeftIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { getUser } from "@/lib/db/users";
import { daysUntil, premiumState } from "@/lib/db/types";
import { hasServiceKey } from "@/lib/supabase/admin";
import { formatDate, formatDateTime, orDash } from "@/lib/format";
import { usersHref } from "@/lib/user-views";

export const metadata: Metadata = {
  // Static, not generated from the row: a per-user title would mean a second
  // read of the same row just to fill the tab, and the operator already knows
  // whose record they opened.
  title: "User — Dose Care Admin",
};

/**
 * One user's record, read-only.
 *
 * This page exists because every row on the Users table has carried an "Open"
 * button pointing at `/admin/users/[id]` while the route did not exist — the
 * table advertised a detail view that answered 404. `getUser()` had already
 * been written for it and sat unused.
 *
 * Read-only is the whole scope. There is no grant, revoke or extend control
 * here: changing a user's premium window writes to the database, and this
 * dashboard's only write path today is the sign-in identity link. An operator
 * comes here to read the row behind a status pill — plan and `premium_until`
 * disagree by design, and this is where you see both.
 *
 * Every column of `UserRow` is shown. A detail page that hides fields sends
 * the operator to the Supabase table editor, which is the thing it is meant
 * to replace.
 */
export default async function UserDetailPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  const gate = await requireAdmin("/admin/users");
  if (!gate.ok) return <Forbidden email={gate.email} />;
  if (!hasServiceKey()) return <MissingServiceKey />;

  const { id } = await params;
  const user = await getUser(id);

  // A bad id in the URL is a 404, not an empty detail page: an empty one
  // reads as "this user has no data", which is a different and wrong fact.
  if (!user) notFound();

  const state = premiumState(user);
  const left = daysUntil(user.premium_until);

  return (
    <div className="container-wide py-12">
      <PageHeader
        title={user.name ?? "Unnamed user"}
        subtitle="The row exactly as stored. Status is derived from plan and premium_until together, so check both before acting on it."
        action={
          <Link href={usersHref({})} className="btn btn-secondary btn-sm">
            <ArrowLeftIcon size={14} />
            All users
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusPill status={state} />
        {user.is_anonymous ? <StatusPill status="anonymous" /> : null}
        <span className="font-mono text-small tracking-wider text-ink-3">
          {user.id}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel id="user-account" title="Account">
          <Field label="Name">{orDash(user.name)}</Field>
          <Field label="Email">
            {user.email ? (
              <span className="break-all">{user.email}</span>
            ) : user.is_anonymous ? (
              <span className="text-ink-3">Anonymous account</span>
            ) : (
              <Dash />
            )}
          </Field>
          <Field label="Age">{orDash(user.age)}</Field>
          <Field label="Timezone">{orDash(user.timezone)}</Field>
          <Field label="Google ID" mono>
            {orDash(user.google_id)}
          </Field>
          <Field label="Avatar URL">
            {user.avatar_url ? (
              <span className="break-all text-small">{user.avatar_url}</span>
            ) : (
              <Dash />
            )}
          </Field>
        </Panel>

        <Panel id="user-premium" title="Premium">
          <Field label="Derived status">
            <StatusPill status={state} />
          </Field>
          {/* `plan` is authoritative for current state and is reset to "free"
              when premium lapses, which is why it can read "free" beside a
              non-null expiry. Both are shown rather than reconciled. */}
          <Field label="Plan">{orDash(user.plan)}</Field>
          <Field label="Period">{orDash(user.plan_period)}</Field>
          <Field label="Source">{orDash(user.plan_source)}</Field>
          <Field label="Premium since">{formatDate(user.premium_since)}</Field>
          <Field label="Premium until">
            {user.premium_until ? (
              <>
                <span>{formatDate(user.premium_until)}</span>
                {left !== null ? (
                  <span className="ml-2 text-small text-ink-3">
                    {left >= 0 ? `${left}d left` : `${-left}d ago`}
                  </span>
                ) : null}
              </>
            ) : (
              <Dash />
            )}
          </Field>
        </Panel>

        <Panel id="user-activity" title="Activity">
          {/* Timestamps here use formatDateTime, not formatDate: on a single
              record the time of day is the thing that tells an operator
              whether a sync is stale. */}
          <Field label="Joined">{formatDateTime(user.created_at)}</Field>
          <Field label="Updated">{formatDateTime(user.updated_at)}</Field>
          <Field label="Last synced">{formatDateTime(user.last_synced_at)}</Field>
        </Panel>

        <Panel id="user-reasons" title="Usage reasons">
          {user.usage_reasons && user.usage_reasons.length > 0 ? (
            <ul className="flex flex-wrap gap-2 py-3">
              {user.usage_reasons.map((reason) => (
                <li key={reason} className="pill bg-bg-alt/70 text-ink-2">
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-ink-2">None recorded.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * The same framed card as `TableCard`, for content that is a record rather
 * than a table — header strip, `label-micro` heading, hairline border.
 */
function Panel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="card overflow-hidden">
      <div className="border-b border-line bg-bg-alt/60 px-4 py-3">
        <h2 id={id} className="label-micro">
          {title}
        </h2>
      </div>
      <dl className="px-4 py-1">{children}</dl>
    </section>
  );
}

/** One label/value row. `mono` marks a value an operator compares elsewhere. */
function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0">
      <dt className="label-micro w-32 shrink-0">{label}</dt>
      <dd className={`min-w-0 flex-1 text-ink ${mono ? "font-mono text-[13px]" : ""}`}>
        {children}
      </dd>
    </div>
  );
}
