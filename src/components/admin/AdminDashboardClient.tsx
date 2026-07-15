"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";
import { DashboardAccordion } from "@/components/admin/DashboardAccordion";
import { ExecutiveCards } from "@/components/admin/ExecutiveCards";
import { QuickActions } from "@/components/admin/QuickActions";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { ExportCenterPanel } from "@/components/admin/DashboardAnalyticsPanels";

const MembershipAnalyticsPanel = dynamic(
  () => import("@/components/admin/DashboardAnalyticsPanels").then((m) => m.MembershipAnalyticsPanel),
  { ssr: false, loading: () => <PanelSkeleton /> },
);
const RevenueAnalyticsPanel = dynamic(
  () => import("@/components/admin/DashboardAnalyticsPanels").then((m) => m.RevenueAnalyticsPanel),
  { ssr: false, loading: () => <PanelSkeleton /> },
);
const AiAnalyticsPanel = dynamic(
  () => import("@/components/admin/DashboardAnalyticsPanels").then((m) => m.AiAnalyticsPanel),
  { ssr: false, loading: () => <PanelSkeleton /> },
);
const ReminderActivityPanel = dynamic(
  () => import("@/components/admin/DashboardAnalyticsPanels").then((m) => m.ReminderActivityPanel),
  { ssr: false, loading: () => <PanelSkeleton /> },
);

function PanelSkeleton() {
  return <div className="h-24 animate-pulse rounded-lg bg-white/[0.04]" />;
}

export function AdminDashboardClient({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {!snapshot.configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-100 sm:text-sm">
          Supabase env is not configured. Set{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </div>
      ) : null}

      {snapshot.loadError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-100 sm:text-sm">
          {snapshot.loadError}{" "}
          {!snapshot.serviceRoleConfigured ? (
            <span className="mt-1 block text-[11px] font-medium text-rose-200/80">
              Add <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the server for full
              auth-backed metrics and exports.
            </span>
          ) : null}
        </div>
      ) : null}

      <ExecutiveCards snapshot={snapshot} />
      <QuickActions />
      <SystemHealth snapshot={snapshot} />
      <RecentActivity snapshot={snapshot} />

      <section className="space-y-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/45">Detailed analytics</h2>
        <DashboardAccordion title="Membership Analytics">
          <Suspense fallback={<PanelSkeleton />}>
            <MembershipAnalyticsPanel snapshot={snapshot} />
          </Suspense>
        </DashboardAccordion>
        <DashboardAccordion title="Revenue Analytics">
          <Suspense fallback={<PanelSkeleton />}>
            <RevenueAnalyticsPanel snapshot={snapshot} />
          </Suspense>
        </DashboardAccordion>
        <DashboardAccordion title="AI Analytics">
          <Suspense fallback={<PanelSkeleton />}>
            <AiAnalyticsPanel snapshot={snapshot} />
          </Suspense>
        </DashboardAccordion>
        <DashboardAccordion title="Reminder Activity">
          <Suspense fallback={<PanelSkeleton />}>
            <ReminderActivityPanel snapshot={snapshot} />
          </Suspense>
        </DashboardAccordion>
        <DashboardAccordion title="Export Center" id="export-center">
          <ExportCenterPanel />
        </DashboardAccordion>
      </section>
    </div>
  );
}
