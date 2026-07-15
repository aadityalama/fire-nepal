"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { AdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";

type ServiceStatus = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

function buildServices(snapshot: AdminSnapshot): ServiceStatus[] {
  const authOk = snapshot.configured && snapshot.serviceRoleConfigured;
  const emailOk = snapshot.systemHealth.resendOk === true;
  const apiOk = snapshot.configured && !snapshot.loadError;

  return [
    {
      id: "database",
      label: "Database",
      ok: snapshot.systemHealth.supabaseOk,
      detail: snapshot.systemHealth.supabaseMessage,
    },
    {
      id: "api",
      label: "API",
      ok: apiOk,
      detail: snapshot.loadError ? snapshot.loadError.slice(0, 80) : "Endpoints responding",
    },
    {
      id: "auth",
      label: "Authentication",
      ok: authOk,
      detail: authOk ? "Admin session + service role" : "Service role or config missing",
    },
    {
      id: "email",
      label: "Email",
      ok: emailOk,
      detail: snapshot.systemHealth.resendMessage,
    },
    {
      id: "ai",
      label: "AI Services",
      ok: snapshot.configured && !Boolean(snapshot.loadError?.includes("fire_ai")),
      detail: "Usage telemetry available",
    },
  ];
}

export function SystemHealth({ snapshot }: { snapshot: AdminSnapshot }) {
  const services = buildServices(snapshot);
  const failed = services.filter((s) => !s.ok);
  const show = failed.length > 0 ? failed : services;
  const allOk = failed.length === 0;

  return (
    <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-transparent px-3.5 py-3 shadow-[0_0_0_1px_rgba(16,185,129,0.05)] backdrop-blur-xl sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/45">System status</h2>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            allOk
              ? "border border-emerald-500/25 bg-emerald-500/12 text-emerald-200"
              : "border border-rose-500/30 bg-rose-500/12 text-rose-200"
          }`}
        >
          {allOk ? "Healthy" : "Attention"}
        </span>
      </div>

      <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {show.map((service) => (
          <li
            key={service.id}
            className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2"
          >
            {service.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-100">{service.label}</p>
              <p className="truncate text-[10px] font-medium text-zinc-500">{service.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-[11px] font-medium text-zinc-500">
        {allOk ? "Everything is operating normally." : "Showing services that need attention."}
      </p>
    </section>
  );
}
