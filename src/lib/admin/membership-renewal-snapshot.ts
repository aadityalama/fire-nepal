import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { User } from "@supabase/supabase-js";

export type AdminRenewalRow = {
  id: string;
  name: string;
  email: string;
  planType: "premium" | "elite";
  expiresAt: string;
  suspendedAt: string | null;
  daysRemaining: number | null;
  daysSinceExpired: number | null;
};

export type AdminMembershipRenewalSnapshot = {
  queue: {
    expiringIn7Days: number;
    expiringIn30DaysExcluding7: number;
    alreadyExpired: number;
  };
  kpi: {
    expiringThisWeek: number;
    expiredMembers: number;
    pendingRenewals: number;
  };
  expiringSoonWidget: AdminRenewalRow[];
  expiredWidget: AdminRenewalRow[];
};

const MAX_WIDGET = 12;

function displayName(u: User, nameById: Map<string, string | null>): string {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";
  const display = nameById.get(u.id);
  return (display && display.trim()) || fromMeta || "—";
}

type ProfileLite = {
  plan_type: string;
  expires_at: string | null;
  suspended_at: string | null;
};

/** Renewal queue + KPIs + widget rows (sorted, capped). */
export function buildMembershipRenewalSnapshot(
  users: User[],
  profileById: Map<string, ProfileLite>,
  subEndById: Map<string, string | null>,
  nameById: Map<string, string | null>,
  pendingMembershipRequests: number,
  now: Date = new Date(),
): AdminMembershipRenewalSnapshot {
  const startToday = startOfDay(now);
  const expSoonAcc: AdminRenewalRow[] = [];
  const expiredAcc: AdminRenewalRow[] = [];
  let exp7 = 0;
  let exp30ex = 0;

  for (const u of users) {
    const prof = profileById.get(u.id);
    const plan = prof?.plan_type;
    if (plan !== "premium" && plan !== "elite") continue;

    const suspendedAt = prof?.suspended_at ?? null;
    const expiresAt = prof?.expires_at ?? subEndById.get(u.id) ?? null;
    if (!expiresAt) continue;

    const exp = new Date(expiresAt);
    if (Number.isNaN(exp.getTime())) continue;

    const expired = exp.getTime() < now.getTime();
    const calRemaining = differenceInCalendarDays(startOfDay(exp), startToday);

    const row: AdminRenewalRow = {
      id: u.id,
      name: displayName(u, nameById),
      email: u.email ?? "—",
      planType: plan as "premium" | "elite",
      expiresAt,
      suspendedAt,
      daysRemaining: expired ? null : calRemaining,
      daysSinceExpired: expired
        ? Math.max(0, differenceInCalendarDays(startToday, startOfDay(exp)))
        : null,
    };

    if (expired) {
      expiredAcc.push(row);
    } else {
      if (suspendedAt) continue;
      if (calRemaining >= 0 && calRemaining <= 7) {
        exp7 += 1;
        expSoonAcc.push(row);
      }
      if (calRemaining >= 8 && calRemaining <= 30) {
        exp30ex += 1;
      }
    }
  }

  expSoonAcc.sort((a, b) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99));
  expiredAcc.sort((a, b) => (b.daysSinceExpired ?? 0) - (a.daysSinceExpired ?? 0));

  const expiredMembers = expiredAcc.length;

  return {
    queue: {
      expiringIn7Days: exp7,
      expiringIn30DaysExcluding7: exp30ex,
      alreadyExpired: expiredMembers,
    },
    kpi: {
      expiringThisWeek: exp7,
      expiredMembers,
      pendingRenewals: pendingMembershipRequests,
    },
    expiringSoonWidget: expSoonAcc.slice(0, MAX_WIDGET),
    expiredWidget: expiredAcc.slice(0, MAX_WIDGET),
  };
}
