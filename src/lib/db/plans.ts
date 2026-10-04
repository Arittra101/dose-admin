import "server-only";

import { adminDb } from "@/lib/supabase/admin";
import type { PlanRow } from "@/lib/db/types";

export async function listPlans(): Promise<PlanRow[]> {
  const db = adminDb();
  const { data, error } = await db
    .from("plans")
    .select("period,amount,duration,is_active")
    .order("amount", { ascending: true });

  if (error) throw new Error(`listPlans: ${error.message}`);
  return (data ?? []) as PlanRow[];
}

/**
 * How many users are currently on each plan period.
 *
 * `users.plan_period` keeps its value after premium lapses, so an active
 * count has to test the expiry too — otherwise the "monthly" row would
 * include everyone who was ever monthly, which is a different and much
 * larger number than the one an operator reads it as.
 */
export async function countActiveByPeriod(): Promise<Record<string, number>> {
  const db = adminDb();
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("users")
    .select("plan_period")
    .neq("plan", "free")
    .gt("premium_until", nowIso);

  if (error) throw new Error(`countActiveByPeriod: ${error.message}`);

  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = (row as { plan_period: string | null }).plan_period ?? "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
