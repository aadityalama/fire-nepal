"use client";

import { Building2, Smartphone, Wallet, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { TIER_DISPLAY } from "@/lib/fire-membership";
import {
  MEMBERSHIP_PLAN_PRICE_NPR,
  PAYMENT_METHOD_LABEL,
  type MembershipPaymentMethod,
  type MembershipRequestPlan,
  membershipQrImageUrl,
  paymentInstructions,
} from "@/lib/membership-payment";

export type MembershipPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MembershipRequestPlan;
  onSubmitted?: () => void;
};

const METHODS: MembershipPaymentMethod[] = ["khalti_qr", "esewa_qr", "global_ime_qr"];

async function membershipRequestErrorMessage(r: Response): Promise<string> {
  const raw = await r.text();
  const trimmed = raw.trim();
  if (!trimmed) {
    return r.statusText?.trim() || `Request failed (HTTP ${r.status})`;
  }
  try {
    const j = JSON.parse(trimmed) as { error?: unknown; message?: unknown; details?: unknown };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    if (typeof j.details === "string" && j.details.trim()) return j.details.trim();
  } catch {
    /* non-JSON body */
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
}

function methodIcon(m: MembershipPaymentMethod) {
  if (m === "khalti_qr") return Wallet;
  if (m === "esewa_qr") return Smartphone;
  return Building2;
}

export function MembershipPaymentModal({ open, onOpenChange, plan, onSubmitted }: MembershipPaymentModalProps) {
  const titleId = useId();
  const [method, setMethod] = useState<MembershipPaymentMethod | null>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const price = MEMBERSHIP_PLAN_PRICE_NPR[plan];
  const planLabel = TIER_DISPLAY[plan].label;

  const submit = async () => {
    if (!method) {
      toast.error("Choose a payment method.");
      return;
    }
    if (!file) {
      toast.error("Upload a payment screenshot or receipt.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("plan", plan);
      fd.set("payment_method", method);
      fd.set("file", file);
      if (reference.trim()) fd.set("reference", reference.trim());
      const r = await fetch("/api/membership-requests", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) {
        const msg = await membershipRequestErrorMessage(r);
        toast.error(msg);
        return;
      }
      toast.success("Payment proof submitted. We will review and activate your plan shortly.");
      onOpenChange(false);
      onSubmitted?.();
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-[201] flex max-h-[min(92vh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#04140f] shadow-[0_40px_120px_rgba(0,0,0,0.75)] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Membership payment</p>
            <h2 id={titleId} className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
              {planLabel} · NPR {price}/year
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">
              Scan a QR, complete payment, then upload proof. An admin verifies every submission before your plan
              activates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Payment method</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {METHODS.map((m) => {
              const Icon = methodIcon(m);
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                    active
                      ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-emerald-500/30"
                  }`}
                >
                  <Icon className="h-5 w-5 opacity-90" aria-hidden />
                  <span className="text-[11px] font-black leading-tight">{PAYMENT_METHOD_LABEL[m]}</span>
                </button>
              );
            })}
          </div>

          {method ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/60">Instructions</p>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-sm font-medium leading-relaxed text-zinc-300">
                  {paymentInstructions(method, plan).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Scan to pay</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic env URLs + SVG placeholders */}
                <img
                  src={membershipQrImageUrl(method)}
                  alt={`${PAYMENT_METHOD_LABEL[method]} payment QR`}
                  className="h-52 w-52 rounded-xl border border-white/10 bg-white object-contain p-2 shadow-inner sm:h-60 sm:w-60"
                />
                <a
                  href={membershipQrImageUrl(method)}
                  download
                  className="text-xs font-bold text-emerald-300 underline-offset-2 hover:underline"
                >
                  Open QR image
                </a>
              </div>

              <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/70">Payment proof</p>
                <label className="block">
                  <span className="text-xs font-bold text-zinc-400">Screenshot or receipt (JPEG, PNG, WebP · max 5 MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-2 block w-full text-sm font-medium text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-emerald-950"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-zinc-400">Reference (optional)</span>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction ID, ref number, etc."
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    maxLength={500}
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm font-medium text-zinc-500">Select Khalti, eSewa, or Global IME to show the QR and upload form.</p>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap gap-2 border-t border-white/[0.06] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] flex-1 rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !method || !file}
            onClick={() => void submit()}
            className="min-h-[44px] flex-[1.2] rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-sm font-black text-emerald-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Submitting…" : "Submit for review"}
          </button>
        </footer>
      </div>
    </div>
  );
}
