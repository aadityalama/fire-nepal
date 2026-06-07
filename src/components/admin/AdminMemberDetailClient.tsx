"use client";

import { format, parseISO } from "date-fns";
import { ArrowLeft, Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { AdminMemberDetail, AdminMemberNoteRow } from "@/lib/admin/fetch-admin-member-detail";
import {
  membershipUiBucket,
  type MembershipUiBucket,
} from "@/lib/membership-profile-status";

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

function shortId(id: string | null): string {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

export function AdminMemberDetailClient({
  detail,
  initialRenewOpen,
}: {
  detail: AdminMemberDetail;
  initialRenewOpen: boolean;
}) {
  const bucket = membershipUiBucket({
    planType: detail.planType,
    expiresAtIso: detail.expiresAt,
    suspendedAtIso: detail.suspendedAt,
  });

  const [notes, setNotes] = useState<AdminMemberNoteRow[]>(detail.notes);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [renewOpen, setRenewOpen] = useState(initialRenewOpen);
  const [renewDays, setRenewDays] = useState("365");
  const [renewAmount, setRenewAmount] = useState("");
  const [renewBusy, setRenewBusy] = useState(false);

  const reloadNotes = useCallback(async () => {
    const r = await fetch(`/api/admin/members/${detail.userId}/notes`, {
      credentials: "include",
      cache: "no-store",
    });
    const j = (await r.json()) as { notes?: AdminMemberNoteRow[] };
    if (r.ok && j.notes) setNotes(j.notes);
  }, [detail.userId]);

  const addNote = async () => {
    const body = newNote.trim();
    if (!body || body.length > 8000) return;
    setSavingNote(true);
    try {
      const r = await fetch(`/api/admin/members/${detail.userId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Failed to save note");
        return;
      }
      setNewNote("");
      await reloadNotes();
    } finally {
      setSavingNote(false);
    }
  };

  const saveEdit = async (noteId: string) => {
    const body = editDraft.trim();
    if (!body || body.length > 8000) return;
    setSavingNote(true);
    try {
      const r = await fetch(`/api/admin/members/${detail.userId}/notes/${noteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Failed to update note");
        return;
      }
      setEditingId(null);
      await reloadNotes();
    } finally {
      setSavingNote(false);
    }
  };

  const submitRenew = async () => {
    const days = Math.floor(Number(renewDays));
    if (!Number.isFinite(days) || days < 1) {
      window.alert("Enter a valid number of days.");
      return;
    }
    const amtRaw = renewAmount.trim();
    const amountNpr = amtRaw === "" ? 0 : Number(amtRaw);
    if (!Number.isFinite(amountNpr) || amountNpr < 0) {
      window.alert("Invalid NPR amount.");
      return;
    }
    setRenewBusy(true);
    try {
      const r = await fetch(`/api/admin/members/${detail.userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew", extendDays: days, amountNpr }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        window.alert(j.error ?? "Renew failed");
        return;
      }
      setRenewOpen(false);
      window.location.reload();
    } finally {
      setRenewBusy(false);
    }
  };

  const canRenew = detail.planType === "premium" || detail.planType === "elite";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Members
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#04120d]/70 p-5 backdrop-blur-xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{detail.name}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">{detail.email}</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-500">{detail.userId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge bucket={bucket} />
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-300">
              {detail.planType}
            </span>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Joined (auth)</dt>
            <dd className="mt-1 font-mono text-zinc-200">
              {detail.createdAt ? format(parseISO(detail.createdAt), "MMM d, yyyy HH:mm") : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Activated</dt>
            <dd className="mt-1 font-mono text-zinc-200">
              {detail.membershipActivatedAt
                ? format(parseISO(detail.membershipActivatedAt), "MMM d, yyyy")
                : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Expires</dt>
            <dd className="mt-1 font-mono text-zinc-200">
              {detail.expiresAt ? format(parseISO(detail.expiresAt), "MMM d, yyyy HH:mm") : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Subscription</dt>
            <dd className="mt-1 text-zinc-200">
              {detail.subscription
                ? `${detail.subscription.plan ?? "—"} · ${detail.subscription.status ?? "—"}`
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {canRenew ? (
            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-50 hover:bg-emerald-500/30"
            >
              Renew membership
            </button>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/60 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/55">Admin notes</h2>
          <span className="text-[10px] text-zinc-500">Visible only via admin APIs (service role)</span>
        </div>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-zinc-500">No notes yet.</p>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-white/[0.06] bg-black/25 p-4 text-sm text-zinc-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  <span>
                    {format(parseISO(n.created_at), "MMM d, yyyy HH:mm")}
                    {n.updated_at !== n.created_at ? (
                      <span className="ml-2 text-zinc-600">· edited {format(parseISO(n.updated_at), "MMM d, HH:mm")}</span>
                    ) : null}
                  </span>
                  <span className="font-mono normal-case text-zinc-600">by {shortId(n.author_id)}</span>
                </div>
                {editingId === n.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={savingNote}
                        onClick={() => void saveEdit(n.id)}
                        className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 whitespace-pre-wrap text-zinc-200">{n.body}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditDraft(n.body);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:underline"
                    >
                      <Pencil className="h-3 w-3" aria-hidden />
                      Edit
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add note</label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            placeholder="Internal note for this member…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="button"
            disabled={savingNote || !newNote.trim()}
            onClick={() => void addNote()}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-xs font-black text-emerald-100 disabled:opacity-40"
          >
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add note
          </button>
        </div>
      </section>

      {renewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1a14] p-5 shadow-2xl">
            <h2 className="text-lg font-black text-white">Renew membership</h2>
            <p className="mt-1 text-sm text-zinc-400">Extend paid access for {detail.email}.</p>
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
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenewOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renewBusy}
                onClick={() => void submitRenew()}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-100 disabled:opacity-50"
              >
                {renewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
