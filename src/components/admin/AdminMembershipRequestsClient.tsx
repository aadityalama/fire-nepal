"use client";

import { format, parseISO } from "date-fns";
import { Check, Download, Eye, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MEMBERSHIP_PLAN_PRICE_NPR,
  PAYMENT_METHOD_LABEL,
  type MembershipPaymentMethod,
  type MembershipRequestPlan,
} from "@/lib/membership-payment";

type Row = {
  id: string;
  user_id: string;
  email: string;
  plan_type: MembershipRequestPlan;
  payment_method: MembershipPaymentMethod;
  /** NPR amount quoted at submission time (stored on the request). */
  amount_npr: number;
  reference: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
};

type Stats = {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
};

function formatNpr(n: number): string {
  return `NPR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
}

function formatSubmitted(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function AdminMembershipRequestsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<Stats>({ pending: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/membership-requests", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as {
        requests?: Row[];
        stats?: Stats;
        error?: string;
      };
      if (!r.ok) {
        toast.error(j.error ?? "Could not load requests");
        setRows([]);
        return;
      }
      setRows(j.requests ?? []);
      setStats(
        j.stats ?? {
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
        },
      );
    } catch {
      toast.error("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const openProof = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/membership-requests/${id}/proof-url`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { signedUrl?: string; error?: string };
      if (!r.ok || !j.signedUrl) {
        toast.error(j.error ?? "Could not load proof");
        return;
      }
      window.open(j.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Network error");
    }
  };

  const downloadProof = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/membership-requests/${id}/proof-url`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { signedUrl?: string; error?: string };
      if (!r.ok || !j.signedUrl) {
        toast.error(j.error ?? "Could not load proof");
        return;
      }
      const a = document.createElement("a");
      a.href = j.signedUrl;
      a.download = `membership-proof-${id}.jpg`;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Network error");
    }
  };

  const patch = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/membership-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Update failed");
        return;
      }
      toast.success(action === "approve" ? "Approved — user plan updated." : "Request rejected.");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !rows) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Membership payments</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400">
            Review QR payment proofs. Approving updates the member&apos;s profile and subscription for one year.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/members"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            Members
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">Pending</p>
          <p className="mt-2 font-mono text-3xl font-black text-white">{stats.pending}</p>
          <p className="mt-1 text-xs text-amber-100/80">Awaiting review</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80">Approved today</p>
          <p className="mt-2 font-mono text-3xl font-black text-white">{stats.approvedToday}</p>
          <p className="mt-1 text-xs text-emerald-100/80">Local server day</p>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-200/80">Rejected today</p>
          <p className="mt-2 font-mono text-3xl font-black text-white">{stats.rejectedToday}</p>
          <p className="mt-1 text-xs text-rose-100/80">Local server day</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#04120d]/80 backdrop-blur-xl">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#06150f]/95 backdrop-blur-md">
            <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Proof</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-200">
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
                  No membership requests yet.
                </td>
              </tr>
            ) : (
              (rows ?? []).map((row) => {
                const pending = row.status === "pending";
                const busy = busyId === row.id;
                const amount =
                  typeof row.amount_npr === "number" && Number.isFinite(row.amount_npr)
                    ? row.amount_npr
                    : MEMBERSHIP_PLAN_PRICE_NPR[row.plan_type];
                return (
                  <tr key={row.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                    <td className="max-w-[15rem] px-4 py-3 align-top">
                      <p className="truncate font-bold text-white" title={row.email}>
                        {row.email}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500" title={row.user_id}>
                        {row.user_id}
                      </p>
                      <Link
                        href={`/admin/members/${row.user_id}`}
                        className="mt-1 inline-block text-[10px] font-bold text-emerald-400/90 hover:underline"
                      >
                        Member detail →
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top font-bold text-emerald-100">
                      {row.plan_type === "elite" ? "Elite" : "Premium"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs font-semibold leading-snug">
                      {PAYMENT_METHOD_LABEL[row.payment_method]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-right font-mono text-sm font-bold text-white">
                      {formatNpr(amount)}
                    </td>
                    <td className="max-w-[11rem] px-4 py-3 align-top text-xs text-zinc-400" title={row.reference ?? ""}>
                      {row.reference ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs leading-relaxed text-zinc-300">
                      {formatSubmitted(row.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          row.status === "approved"
                            ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                            : row.status === "rejected"
                              ? "border border-rose-400/35 bg-rose-500/15 text-rose-200"
                              : "border border-amber-400/35 bg-amber-500/15 text-amber-100"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openProof(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-emerald-200 transition hover:bg-white/[0.08]"
                        >
                          <Eye size={12} aria-hidden />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadProof(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-zinc-200 transition hover:bg-white/[0.08]"
                        >
                          <Download size={12} aria-hidden />
                          Download
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      {pending ? (
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void patch(row.id, "reject")}
                            className="inline-flex w-full min-w-[6.5rem] items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50 sm:w-auto"
                          >
                            <XCircle size={14} aria-hidden />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void patch(row.id, "approve")}
                            className="inline-flex w-full min-w-[6.5rem] items-center justify-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-500/30 disabled:opacity-50 sm:w-auto"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={14} aria-hidden />}
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
