"use client";

import { Check, Circle, LayoutDashboard, ListChecks } from "lucide-react";
import Link from "next/link";
import { useEffect, useId } from "react";
import type { MembershipPaymentSuccessPayload, MembershipRequestPlan } from "@/lib/membership-payment";

export type { MembershipPaymentSuccessPayload } from "@/lib/membership-payment";

export type MembershipPaymentSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: MembershipPaymentSuccessPayload | null;
  onViewMembershipStatus: () => void;
};

function planDisplayName(plan: MembershipRequestPlan): string {
  return plan === "elite" ? "Elite" : "Premium";
}

function statusDisplay(status: MembershipPaymentSuccessPayload["status"]): string {
  if (status === "pending") return "Pending Review";
  if (status === "approved") return "Approved";
  return "Rejected";
}

export function MembershipPaymentSuccessDialog({
  open,
  onOpenChange,
  payload,
  onViewMembershipStatus,
}: MembershipPaymentSuccessDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !payload) return null;

  const submitted = new Date(payload.createdAtIso);
  const when = Number.isNaN(submitted.getTime())
    ? "—"
    : submitted.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-[211] flex max-h-[min(92vh,46rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-emerald-500/20 bg-[#04140f] shadow-[0_40px_120px_rgba(0,0,0,0.78)] sm:rounded-3xl"
      >
        <div className="overflow-y-auto px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40">
            <Check className="h-9 w-9 text-emerald-400" strokeWidth={3} aria-hidden />
          </div>
          <h2 id={titleId} className="mt-6 text-center text-xl font-black tracking-tight text-white sm:text-2xl">
            Payment proof submitted successfully
          </h2>
          <p className="mt-3 text-center text-sm font-medium leading-relaxed text-zinc-400">
            Your membership request has been received and is pending review.
          </p>

          <dl className="mt-8 space-y-3 rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-[11px] font-black uppercase tracking-wide text-zinc-500">Plan</dt>
              <dd className="text-sm font-bold text-white">{planDisplayName(payload.plan)}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-[11px] font-black uppercase tracking-wide text-zinc-500">Submitted</dt>
              <dd className="text-sm font-semibold text-zinc-200">{when}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-[11px] font-black uppercase tracking-wide text-zinc-500">Status</dt>
              <dd>
                <span className="inline-flex rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-100">
                  {statusDisplay(payload.status)}
                </span>
              </dd>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <dt className="text-[10px] font-black uppercase tracking-wide text-zinc-600">Request ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-zinc-400">{payload.requestId}</dd>
            </div>
          </dl>

          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">Progress</p>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Payment Submitted</p>
                  <p className="text-xs font-medium text-zinc-500">Proof received</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-lg leading-none text-amber-200"
                  aria-hidden
                >
                  ⏳
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-100/95">Under Review</p>
                  <p className="text-xs font-medium text-zinc-500">Team verifying your payment</p>
                </div>
              </li>
              <li className="flex gap-3 opacity-60">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-600/60 bg-zinc-800/50 text-zinc-500">
                  <Circle className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-zinc-400">Membership Activated</p>
                  <p className="text-xs font-medium text-zinc-600">After approval</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard"
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-sm font-black text-emerald-950 shadow-lg transition hover:brightness-110 sm:min-w-[10rem]"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onViewMembershipStatus();
              }}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white transition hover:bg-white/[0.08] sm:min-w-[10rem]"
            >
              <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
              View Membership Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
