"use client";

import { format, parseISO } from "date-fns";
import { ArrowLeft, Eye, Loader2, Mail, Pencil, Plus, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { AdminMemberDetail, AdminMemberNoteRow } from "@/lib/admin/fetch-admin-member-detail";
import { formatMembershipReminderType } from "@/lib/membership-renewal-reminders/reminder-next";
import {
  MEMBERSHIP_UI_BUCKET_LABEL,
  membershipUiBucket,
  planTypeLabel,
  type MembershipUiBucket,
} from "@/lib/membership-profile-status";

function StatusBadge({ bucket }: { bucket: MembershipUiBucket }) {
  const styles: Record<MembershipUiBucket, string> = {
    active: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
    expiring_soon: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    expired: "border-rose-500/35 bg-rose-500/15 text-rose-100",
    free: "border-zinc-600/50 bg-zinc-800/60 text-zinc-300",
    suspended: "border-violet-500/35 bg-violet-500/15 text-violet-100",
    archived: "border-slate-500/40 bg-slate-800/50 text-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[bucket]}`}
    >
      {MEMBERSHIP_UI_BUCKET_LABEL[bucket]}
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
  const router = useRouter();
  const bucket = membershipUiBucket({
    planType: detail.planType,
    expiresAtIso: detail.expiresAt,
    suspendedAtIso: detail.suspendedAt,
    archivedAtIso: detail.archivedAt,
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
  const [reminderBusy, setReminderBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const reminderTimeline = useMemo(
    () => [...detail.reminders].sort((a, b) => a.sent_at.localeCompare(b.sent_at)),
    [detail.reminders],
  );

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

  const canRenew =
    (detail.planType === "premium" || detail.planType === "elite") && !detail.archivedAt;
  const remindersDisabled = Boolean(detail.suspendedAt) || Boolean(detail.archivedAt);

  const runReminderAction = async (action: "preview" | "send_now" | "resend_last") => {
    setReminderBusy(true);
    try {
      const r = await fetch(`/api/admin/members/${detail.userId}/reminders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await r.json()) as {
        error?: string;
        preview?: { subject: string; html: string; text: string };
      };
      if (!r.ok) {
        window.alert(j.error ?? "Request failed");
        return;
      }
      if (action === "preview" && j.preview?.html) {
        setPreviewHtml(j.preview.html);
        setPreviewOpen(true);
        return;
      }
      router.refresh();
    } finally {
      setReminderBusy(false);
    }
  };

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
          <Link
            href={`/admin/members?crm=${encodeURIComponent(detail.userId)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            CRM panel
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
              {planTypeLabel(detail.planType)}
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

      {canRenew ? (
        <section className="rounded-2xl border border-white/[0.08] bg-[#04120d]/60 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/55">Renewal reminders</h2>
              <p className="mt-1 text-xs text-zinc-500">Logged sends and manual actions via Resend.</p>
              {remindersDisabled ? (
                <p className="mt-2 text-xs font-semibold text-amber-200/90">Suspended — renewal emails are blocked.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={reminderBusy || remindersDisabled}
                onClick={() => void runReminderAction("preview")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07] disabled:opacity-40"
              >
                {reminderBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                Preview email
              </button>
              <button
                type="button"
                disabled={reminderBusy || remindersDisabled}
                onClick={() => void runReminderAction("send_now")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Send now
              </button>
              <button
                type="button"
                disabled={reminderBusy || remindersDisabled}
                onClick={() => void runReminderAction("resend_last")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/[0.07] disabled:opacity-40"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Resend last
              </button>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Last reminder sent</dt>
              <dd className="mt-1 font-mono text-zinc-200">
                {detail.reminderSummary.lastSentAt
                  ? format(parseISO(detail.reminderSummary.lastSentAt), "MMM d, yyyy HH:mm")
                  : "—"}
              </dd>
              {detail.reminderSummary.lastReminderTypeLabel ? (
                <p className="mt-1 text-xs text-zinc-500">{detail.reminderSummary.lastReminderTypeLabel}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Next reminder due</dt>
              <dd className="mt-1 font-mono text-zinc-200">
                {detail.reminderSummary.nextReminderDueDay
                  ? format(parseISO(`${detail.reminderSummary.nextReminderDueDay}T12:00:00`), "MMM d, yyyy")
                  : "—"}
              </dd>
              {detail.reminderSummary.nextReminderLabel ? (
                <p className="mt-1 text-xs text-zinc-500">{detail.reminderSummary.nextReminderLabel}</p>
              ) : null}
            </div>
          </dl>

          <div className="relative mt-6 pl-5">
            <div className="absolute bottom-0 left-[7px] top-0 w-px bg-white/[0.08]" aria-hidden />
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Reminder history</p>
            {reminderTimeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No renewal emails logged for this member yet.</p>
            ) : (
              <ul className="space-y-4">
                {reminderTimeline.map((row) => (
                  <li key={row.id} className="relative">
                    <span className="absolute -left-[13px] top-1.5 h-2.5 w-2.5 rounded-full border border-emerald-500/40 bg-emerald-500/70" />
                    <p className="text-xs font-bold text-emerald-200/90">{formatMembershipReminderType(row.reminder_type)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                      {format(parseISO(row.sent_at), "MMM d, yyyy HH:mm")} · {row.delivery_status} · {row.membership_plan}
                    </p>
                    {row.subject ? <p className="mt-1 text-xs text-zinc-400">{row.subject}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

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

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0a1a14] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-black text-white">Email preview</h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300"
              >
                Close
              </button>
            </div>
            <iframe
              title="Renewal email preview"
              className="min-h-[420px] flex-1 w-full bg-white"
              sandbox="allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>
        </div>
      ) : null}

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
