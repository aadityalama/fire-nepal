"use client";

import { format, parseISO } from "date-fns";
import { ArrowRight, Mail, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import type { AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";
import { EmptyState } from "@/components/admin/EmptyState";

type ActivityRow = {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: typeof UserPlus;
  when: string | null;
};

function safeFormat(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "MMM d · HH:mm");
  } catch {
    return "";
  }
}

export function RecentActivity({ snapshot }: { snapshot: AdminSnapshot }) {
  const rows: ActivityRow[] = [];

  const latestSignup = snapshot.recentSignups[0];
  if (latestSignup) {
    rows.push({
      id: `signup-${latestSignup.id}`,
      title: "Latest signup",
      detail: `${latestSignup.name} · ${latestSignup.email}`,
      href: "/admin/members",
      icon: UserPlus,
      when: latestSignup.joinedAt,
    });
  }

  const mrq = snapshot.membershipRequestsSummary;
  if (mrq.pending > 0 || mrq.approvedToday > 0) {
    rows.push({
      id: "payments",
      title: "Latest payment queue",
      detail:
        mrq.pending > 0
          ? `${mrq.pending} pending renewal request${mrq.pending === 1 ? "" : "s"}`
          : `${mrq.approvedToday} approved today`,
      href: "/admin/membership-requests",
      icon: Wallet,
      when: null,
    });
  }

  const latestReminder =
    snapshot.membershipRenewalReminders.recentSentToday.find((r) => r.deliveryStatus === "sent") ??
    snapshot.membershipRenewalReminders.recentSentToday[0];
  if (latestReminder) {
    rows.push({
      id: `reminder-${latestReminder.userId}-${latestReminder.sentAt}`,
      title: "Latest reminder",
      detail: `${latestReminder.reminderType} · ${latestReminder.email}`,
      href: "/admin/members?filter=expiring_soon",
      icon: Mail,
      when: latestReminder.sentAt,
    });
  }

  const failed = snapshot.membershipRenewalReminders.recentFailed[0];
  if (failed && rows.length < 5) {
    rows.push({
      id: `fail-${failed.userId}-${failed.sentAt}`,
      title: "Failed reminder",
      detail: `${failed.reminderType} · ${failed.email}`,
      href: "/admin/members",
      icon: Mail,
      when: failed.sentAt,
    });
  }

  const limited = rows.slice(0, 5);

  return (
    <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-3.5 py-3 shadow-[0_0_0_1px_rgba(16,185,129,0.05)] backdrop-blur-xl sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/45">Recent activity</h2>
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300/90 transition hover:text-emerald-200"
        >
          View all
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {limited.length === 0 ? (
        <div className="mt-2.5">
          <EmptyState />
        </div>
      ) : (
        <ul className="mt-2.5 divide-y divide-white/[0.05]">
          {limited.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex items-start gap-2.5 py-2 transition hover:bg-white/[0.02]"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-300">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-zinc-100">{row.title}</p>
                      {row.when ? (
                        <span className="shrink-0 font-mono text-[10px] text-zinc-600">{safeFormat(row.when)}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] font-medium text-zinc-500">{row.detail}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
