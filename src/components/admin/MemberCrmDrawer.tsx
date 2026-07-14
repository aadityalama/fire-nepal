"use client";

import { format, parseISO } from "date-fns";
import {
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  User,
  X,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MemberCrmPayload, MemberCrmTimelineRow } from "@/lib/admin/fetch-member-crm";
import {
  MEMBER_PERMANENT_DELETE_CONFIRMATION,
  MEMBER_PERMANENT_DELETE_WARNING,
} from "@/lib/admin/member-permanent-delete-phrase";

function formatNpr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n);
}

function scoreLabel(s: MemberCrmPayload["memberScore"]): string {
  const m: Record<MemberCrmPayload["memberScore"], string> = {
    vip: "VIP",
    regular: "Regular",
    new_member: "New member",
    inactive: "Inactive",
  };
  return m[s];
}

function scoreStyle(s: MemberCrmPayload["memberScore"]): string {
  const m: Record<MemberCrmPayload["memberScore"], string> = {
    vip: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    regular: "border-emerald-500/35 bg-emerald-500/12 text-emerald-100",
    new_member: "border-sky-500/35 bg-sky-500/12 text-sky-100",
    inactive: "border-zinc-600/50 bg-zinc-800/60 text-zinc-300",
  };
  return m[s];
}

function timelineDot(tone: MemberCrmTimelineRow["tone"]): string {
  const m: Record<string, string> = {
    success: "bg-emerald-500",
    danger: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    neutral: "bg-zinc-500",
  };
  return m[tone] ?? "bg-zinc-500";
}

export function MemberCrmDrawer({
  userId,
  open,
  onClose,
  onUpdated,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}) {
  const [crm, setCrm] = useState<MemberCrmPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDays, setRenewDays] = useState("365");
  const [renewAmount, setRenewAmount] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [permPhrase, setPermPhrase] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/members/${userId}/crm`, { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; crm?: MemberCrmPayload; error?: string };
      if (!r.ok || !j.crm) {
        setError(j.error ?? "Failed to load member");
        setCrm(null);
        return;
      }
      setCrm(j.crm);
    } catch {
      setError("Network error");
      setCrm(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/admin-status", { credentials: "include", cache: "no-store" });
        const j = (await r.json()) as { isSuperAdmin?: boolean };
        if (!cancelled) setIsSuperAdmin(Boolean(j.isSuperAdmin));
      } catch {
        if (!cancelled) setIsSuperAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setCrm(null);
        setRenewOpen(false);
        setIsSuperAdmin(false);
        setPermOpen(false);
        setPermPhrase("");
      });
      return;
    }
    if (!userId) return;
    queueMicrotask(() => {
      void load();
    });
  }, [open, userId, load]);

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    if (!userId) return false;
    setBusy("patch");
    try {
      const r = await fetch(`/api/admin/members/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Action failed");
        return false;
      }
      const { broadcastMembershipUpdated } = await import("@/services/membership-service");
      broadcastMembershipUpdated(userId);
      await load();
      await onUpdated();
      return true;
    } finally {
      setBusy(null);
    }
  };

  const sendReminder = async () => {
    if (!userId) return;
    setBusy("reminder");
    try {
      const r = await fetch(`/api/admin/members/${userId}/reminders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_now" }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Could not send reminder");
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const submitRenew = async () => {
    if (!userId) return;
    const days = Math.floor(Number(renewDays));
    if (!Number.isFinite(days) || days < 1) {
      window.alert("Enter valid days.");
      return;
    }
    const amountNpr = renewAmount.trim() === "" ? 0 : Number(renewAmount);
    if (!Number.isFinite(amountNpr) || amountNpr < 0) {
      window.alert("Invalid amount");
      return;
    }
    await patch({ action: "renew", extendDays: days, amountNpr });
    setRenewOpen(false);
    setRenewDays("365");
    setRenewAmount("");
  };

  if (!open) return null;

  const paid = crm?.planType === "premium" || crm?.planType === "elite";
  const suspended = crm?.membershipStatus === "Suspended";
  const archived = Boolean(crm?.isArchived);

  const submitPermanentRemove = async () => {
    if (permPhrase.trim() !== MEMBER_PERMANENT_DELETE_CONFIRMATION) {
      window.alert(`Type exactly: ${MEMBER_PERMANENT_DELETE_CONFIRMATION}`);
      return;
    }
    const ok = await patch({
      action: "permanent_remove",
      confirmationText: permPhrase.trim(),
    });
    if (ok) {
      setPermOpen(false);
      setPermPhrase("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-white/[0.08] bg-[#050d0a] shadow-2xl sm:max-w-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/50">Member CRM</p>
            <h2 className="mt-1 truncate text-lg font-black text-white">
              {loading ? "Loading…" : crm?.fullName ?? "—"}
            </h2>
            <p className="truncate font-mono text-xs text-zinc-500">{crm?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-zinc-400 hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-hidden />
            </div>
          ) : crm ? (
            <div className="space-y-8 pb-10">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${scoreStyle(crm.memberScore)}`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {scoreLabel(crm.memberScore)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-zinc-300">
                  {crm.planType}
                </span>
                <span className="text-xs font-semibold text-zinc-400">{crm.membershipStatus}</span>
              </div>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Profile</h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Join date</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {crm.joinedAt ? format(parseISO(crm.joinedAt), "MMM d, yyyy") : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Expiry</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {crm.expiryAt ? format(parseISO(crm.expiryAt), "MMM d, yyyy HH:mm") : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Days left</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">{crm.daysLeftLabel ?? "—"}</dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Location</dt>
                    <dd className="mt-0.5 flex items-start gap-1.5 text-zinc-200">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                      <span>
                        {crm.country}
                        {crm.region !== "Unknown" ? ` · ${crm.region}` : ""}
                        {crm.timezone !== "Unknown" ? ` · ${crm.timezone}` : ""}
                      </span>
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Last login</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {crm.lastLoginAt ? format(parseISO(crm.lastLoginAt), "MMM d, yyyy HH:mm") : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Last active (app)</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {crm.lastActiveAt ? format(parseISO(crm.lastActiveAt), "MMM d, yyyy HH:mm") : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Account created</dt>
                    <dd className="mt-0.5 font-mono text-zinc-200">
                      {crm.accountCreatedAt ? format(parseISO(crm.accountCreatedAt), "MMM d, yyyy HH:mm") : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-zinc-500">Device / browser</dt>
                    <dd className="mt-0.5 text-zinc-300">
                      {crm.deviceHint ?? "Unknown"}
                      {crm.browserHint ? ` · ${crm.browserHint}` : ""}
                      {crm.loginCountryHint ? ` · Country code: ${crm.loginCountryHint}` : ""}
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Lifetime value</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-[10px] font-bold uppercase text-emerald-200/70">Total revenue</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">{formatNpr(crm.ltv.totalRevenueNpr)}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Payments</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">{crm.ltv.totalPayments}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Current plan</p>
                    <p className="mt-1 font-bold capitalize text-zinc-200">{crm.ltv.currentPlan}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">Avg / payment</p>
                    <p className="mt-1 font-mono text-sm font-bold text-zinc-200">
                      {crm.ltv.avgRevenuePerRenewalNpr != null ? formatNpr(crm.ltv.avgRevenuePerRenewalNpr) : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Membership span:{" "}
                  {crm.ltv.membershipDurationDays != null ? `${crm.ltv.membershipDurationDays} days (since first paid)` : "—"}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Quick actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paid ? (
                    <button
                      type="button"
                      disabled={!!busy || suspended || archived}
                      onClick={() => setRenewOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Renew
                    </button>
                  ) : null}
                  {paid ? (
                    <button
                      type="button"
                      disabled={!!busy || suspended || archived}
                      onClick={() => void sendReminder()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      Send reminder
                    </button>
                  ) : null}
                  {!archived ? (
                    <>
                      {!suspended ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => {
                            if (window.confirm(`Suspend ${crm.email}?`)) void patch({ action: "suspend" });
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 disabled:opacity-40"
                        >
                          <Shield className="h-3.5 w-3.5" aria-hidden />
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void patch({ action: "reactivate" })}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive ${crm.email}? They will be hidden from the active roster and lose paid access.`,
                            )
                          ) {
                            void patch({ action: "archive" });
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-500/35 bg-slate-500/10 px-3 py-2 text-xs font-bold text-slate-100 disabled:opacity-40"
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden />
                        Archive
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => {
                        if (window.confirm(`Restore ${crm.email} from archive?`)) void patch({ action: "restore_archive" });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                      Restore from archive
                    </button>
                  )}
                  <Link
                    href={`/admin/membership-requests?user=${userId}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100"
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden />
                    Payment proofs
                  </Link>
                  <Link
                    href={`/admin/members/${userId}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300"
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Full detail page
                  </Link>
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => setPermOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-600/50 bg-rose-950/40 px-3 py-2 text-xs font-black text-rose-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Permanent remove…
                    </button>
                  ) : null}
                </div>
                {isSuperAdmin ? (
                  <p className="mt-2 text-[11px] font-medium text-zinc-500">
                    Permanent remove is super-admin only. Revenue and reminder history rows are not deleted from the
                    database.
                  </p>
                ) : null}
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Payment history</h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-black/30 text-[10px] font-black uppercase text-zinc-500">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crm.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                            No payments on file.
                          </td>
                        </tr>
                      ) : (
                        crm.payments.map((p) => (
                          <tr key={p.id} className="border-b border-white/[0.04]">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-300">
                              {format(parseISO(p.paymentDate), "MMM d, yyyy")}
                            </td>
                            <td className="px-3 py-2 capitalize text-zinc-200">{p.planPurchased ?? "—"}</td>
                            <td className="px-3 py-2 font-mono text-zinc-200">
                              {p.currency} {p.amount}
                            </td>
                            <td className="px-3 py-2 text-zinc-400">{p.paymentMethod ?? "—"}</td>
                            <td className="px-3 py-2 text-zinc-300">{p.approvalStatus}</td>
                            <td className="max-w-[140px] truncate px-3 py-2 font-mono text-[10px] text-zinc-500">
                              {p.transactionReference ?? "—"}
                              {p.proofUrl ? (
                                <a
                                  href={p.proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-2 font-bold text-emerald-400 hover:underline"
                                >
                                  Proof
                                </a>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Membership timeline</h3>
                <div className="relative mt-4 border-l border-white/[0.08] pl-5">
                  {crm.timeline.length === 0 ? (
                    <p className="text-sm text-zinc-500">No timeline events yet.</p>
                  ) : (
                    <ul className="space-y-5">
                      {crm.timeline.map((ev) => (
                        <li key={ev.id} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${timelineDot(ev.tone)}`}
                          />
                          <p className="text-[10px] font-mono uppercase text-zinc-500">
                            {format(parseISO(ev.occurredAt), "MMM d, yyyy · HH:mm")}
                          </p>
                          <p className="mt-0.5 font-semibold text-white">{ev.title}</p>
                          {ev.subtitle ? <p className="mt-1 text-xs text-zinc-400">{ev.subtitle}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">Notes history</h3>
                <div className="mt-3 space-y-3">
                  {crm.notes.length === 0 ? (
                    <p className="text-sm text-zinc-500">No admin notes.</p>
                  ) : (
                    [...crm.notes]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((n) => (
                        <div key={n.id} className="rounded-xl border border-white/[0.06] bg-black/25 p-3 text-sm">
                          <div className="flex flex-wrap justify-between gap-2 text-[10px] font-bold uppercase text-zinc-500">
                            <span>{n.authorLabel}</span>
                            <span className="font-mono normal-case text-zinc-600">
                              {format(parseISO(n.createdAt), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-zinc-200">{n.body}</p>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {renewOpen && crm ? (
          <div className="absolute inset-0 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1a14] p-4 shadow-xl">
              <h4 className="font-black text-white">Renew membership</h4>
              <label className="mt-3 block text-xs font-bold text-zinc-500">
                Days
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
                  value={renewDays}
                  onChange={(e) => setRenewDays(e.target.value)}
                />
              </label>
              <label className="mt-2 block text-xs font-bold text-zinc-500">
                NPR (optional)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(e.target.value)}
                />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setRenewOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void submitRenew()}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-100"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {permOpen && crm ? (
          <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#1a0a0c] p-5 shadow-xl">
              <h4 className="font-black text-rose-100">Permanent account removal</h4>
              <p className="mt-2 text-sm font-semibold text-rose-200/95">{MEMBER_PERMANENT_DELETE_WARNING}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Super-admin only. Bans the account, resets membership fields, and archives the profile. Revenue events,
                reminder logs, and membership requests are not deleted.
              </p>
              <p className="mt-3 font-mono text-[11px] text-zinc-500">
                Phrase: <span className="text-amber-200/90">{MEMBER_PERMANENT_DELETE_CONFIRMATION}</span>
              </p>
              <label className="mt-4 block text-xs font-bold text-zinc-500">
                Confirmation
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-white"
                  value={permPhrase}
                  onChange={(e) => setPermPhrase(e.target.value)}
                  placeholder={MEMBER_PERMANENT_DELETE_CONFIRMATION}
                  autoComplete="off"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPermOpen(false);
                    setPermPhrase("");
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void submitPermanentRemove()}
                  className="rounded-lg border border-rose-600/50 bg-rose-600/25 px-3 py-1.5 text-xs font-black text-rose-50"
                >
                  Remove account
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
