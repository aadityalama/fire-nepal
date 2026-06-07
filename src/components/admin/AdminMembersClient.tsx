"use client";

import { format, parseISO } from "date-fns";
import { ChevronDown, MoreHorizontal, Search, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminMemberRow } from "@/lib/admin/fetch-admin-members";
import {
  formatDaysLeftLabel,
  membershipDaysRemaining,
  membershipUiBucket,
  type MembershipUiBucket,
} from "@/lib/membership-profile-status";

type MemberFilter =
  | "all"
  | "free"
  | "premium"
  | "elite"
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended";

function StatusBadge({ bucket }: { bucket: MembershipUiBucket }) {
  const styles: Record<MembershipUiBucket, string> = {
    active: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
    expiring_soon: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    expired: "border-rose-500/35 bg-rose-500/15 text-rose-100",
    free: "border-zinc-600/50 bg-zinc-800/60 text-zinc-300",
    suspended: "border-violet-500/35 bg-violet-500/15 text-violet-100",
  };
  const label: Record<MembershipUiBucket, string> = {
    active: "Active",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    free: "Free",
    suspended: "Suspended",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[bucket]}`}
    >
      {label[bucket]}
    </span>
  );
}

function PlanPill({ plan }: { plan: AdminMemberRow["planType"] }) {
  const cls =
    plan === "free"
      ? "border-zinc-600/50 bg-zinc-800/50 text-zinc-300"
      : plan === "elite"
        ? "border-amber-500/35 bg-amber-500/12 text-amber-100"
        : "border-emerald-500/30 bg-emerald-500/12 text-emerald-100";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${cls}`}>
      {plan}
    </span>
  );
}

export function AdminMembersClient({
  initialMembers,
  initialError,
}: {
  initialMembers: AdminMemberRow[];
  initialError: string | null;
}) {
  const [members, setMembers] = useState<AdminMemberRow[]>(initialMembers);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renewTarget, setRenewTarget] = useState<AdminMemberRow | null>(null);
  const [renewDays, setRenewDays] = useState("365");
  const [renewAmount, setRenewAmount] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/members", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as { members?: AdminMemberRow[]; error?: string };
      if (!r.ok) {
        setLoadError(j.error ?? "Failed to load members");
        return;
      }
      setLoadError(null);
      setMembers(j.members ?? []);
    } catch {
      setLoadError("Network error loading members");
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuUserId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((row) => {
      const bucket = membershipUiBucket({
        planType: row.planType,
        expiresAtIso: row.expiresAt,
        suspendedAtIso: row.suspendedAt,
      });
      if (filter === "free" && row.planType !== "free") return false;
      if (filter === "premium" && row.planType !== "premium") return false;
      if (filter === "elite" && row.planType !== "elite") return false;
      if (filter === "active" && bucket !== "active") return false;
      if (filter === "expiring_soon" && bucket !== "expiring_soon") return false;
      if (filter === "expired" && bucket !== "expired") return false;
      if (filter === "suspended" && bucket !== "suspended") return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });
  }, [members, search, filter]);

  const scrollToUser = (id: string) => {
    setMenuUserId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`member-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const patchMember = async (userId: string, body: Record<string, unknown>) => {
    setBusyId(userId);
    try {
      const r = await fetch(`/api/admin/members/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Request failed");
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
      setMenuUserId(null);
    }
  };

  const submitRenew = async () => {
    if (!renewTarget) return;
    const days = Math.floor(Number(renewDays));
    if (!Number.isFinite(days) || days < 1) {
      window.alert("Enter a valid number of days (1–3650).");
      return;
    }
    const amtRaw = renewAmount.trim();
    const amountNpr = amtRaw === "" ? 0 : Number(amtRaw);
    if (!Number.isFinite(amountNpr) || amountNpr < 0) {
      window.alert("Enter a valid NPR amount (0 or positive).");
      return;
    }
    await patchMember(renewTarget.id, { action: "renew", extendDays: days, amountNpr });
    setRenewTarget(null);
    setRenewDays("365");
    setRenewAmount("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Membership management</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400">
            Users, plans, expiry, suspension, and renewals. Changes sync to profiles, subscriptions, and the revenue
            ledger where applicable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
          >
            Refresh
          </button>
          <Link
            href="/admin"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/18"
          >
            Operations overview
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/60 p-4 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="relative flex min-w-[12rem] flex-1 items-center gap-2">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or user id"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter</span>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as MemberFilter)}
                className="appearance-none rounded-xl border border-white/10 bg-black/30 py-2 pl-3 pr-9 text-xs font-bold text-emerald-100"
              >
                <option value="all">All users</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="elite">Elite</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06]" ref={menuRef}>
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/25 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activated</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Days left</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const bucket = membershipUiBucket({
                  planType: row.planType,
                  expiresAtIso: row.expiresAt,
                  suspendedAtIso: row.suspendedAt,
                });
                const days = membershipDaysRemaining(row.expiresAt);
                const daysLabel = formatDaysLeftLabel(row.planType, row.expiresAt, row.suspendedAt);
                const open = menuUserId === row.id;
                const busy = busyId === row.id;
                return (
                  <tr
                    key={row.id}
                    id={`member-row-${row.id}`}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-300/90">
                          <User className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{row.name}</p>
                          <p className="truncate font-mono text-xs text-zinc-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanPill plan={row.planType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge bucket={bucket} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {row.membershipActivatedAt
                        ? format(parseISO(row.membershipActivatedAt), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {row.expiresAt ? format(parseISO(row.expiresAt), "MMM d, yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-xs font-bold ${
                          days !== null && days <= 0 && row.planType !== "free" && !row.suspendedAt
                            ? "text-rose-300"
                            : "text-zinc-300"
                        }`}
                      >
                        {daysLabel}
                      </span>
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setMenuUserId(open ? null : row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs font-bold text-emerald-100 hover:bg-white/[0.06] disabled:opacity-50"
                        aria-expanded={open}
                        aria-haspopup="true"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                        Menu
                      </button>
                      {open ? (
                        <div className="absolute right-4 z-20 mt-1 w-48 rounded-xl border border-white/10 bg-[#0a1a14] py-1 shadow-xl">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/[0.06]"
                            onClick={() => scrollToUser(row.id)}
                          >
                            View (scroll to row)
                          </button>
                          {(row.planType === "premium" || row.planType === "elite") && !row.suspendedAt ? (
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/[0.06]"
                              onClick={() => {
                                setRenewTarget(row);
                                setMenuUserId(null);
                              }}
                            >
                              Renew membership…
                            </button>
                          ) : null}
                          {!row.suspendedAt ? (
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-100 hover:bg-white/[0.06]"
                              onClick={() => {
                                if (window.confirm(`Suspend ${row.email}? They will lose paid access until reactivated.`)) {
                                  void patchMember(row.id, { action: "suspend" });
                                }
                              }}
                            >
                              Suspend user
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-semibold text-emerald-100 hover:bg-white/[0.06]"
                              onClick={() => void patchMember(row.id, { action: "reactivate" })}
                            >
                              Reactivate user
                            </button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No members match your filters.</p>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {filtered.length} of {members.length} users shown. Status uses expiry date and suspension from{" "}
          <code className="rounded bg-black/40 px-1">profiles</code>.
        </p>
      </section>

      {renewTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="renew-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1a14] p-5 shadow-2xl"
          >
            <h2 id="renew-title" className="text-lg font-black text-white">
              Renew membership
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Extend <span className="font-bold text-emerald-200">{renewTarget.email}</span> ({renewTarget.planType}).
              New expiry is computed from the later of today or the current expiry, plus the extension.
            </p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Extension (days)
              <input
                type="number"
                min={1}
                max={3650}
                value={renewDays}
                onChange={(e) => setRenewDays(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              NPR amount (optional ledger)
              <input
                type="number"
                min={0}
                step="0.01"
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                placeholder="0 = adjustment note only"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenewTarget(null);
                  setRenewDays("365");
                  setRenewAmount("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRenew()}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/30"
              >
                Apply renewal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-center text-xs text-zinc-600">
        <Link href="/admin/membership-requests" className="font-semibold text-emerald-400/90 underline-offset-2 hover:underline">
          Membership payment requests
        </Link>
      </p>
    </div>
  );
}
