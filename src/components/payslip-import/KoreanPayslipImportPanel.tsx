"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileScan,
  Sparkles,
  TrendingUp,
  Upload,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CashflowGlassCard, CashflowInsetCard } from "@/components/cashflow/CashflowGlassCard";
import { applyPayslipToCashflowStorage } from "@/components/payslip-import/apply-payslip-to-cashflow";
import { computePayslipTrendAnalytics } from "@/components/payslip-import/payslip-analytics";
import { parsePayslipFromOcr } from "@/components/payslip-import/payslip-from-ocr";
import {
  appendPayslipHistoryEntry,
  loadPayslipHistoryState,
  markPayslipEntryApplied,
  PAYSLIP_HISTORY_SYNC_EVENT,
} from "@/components/payslip-import/payslip-history-storage";
import { krwToNpr } from "@/components/payslip-import/krw-normalize";
import { mockOcrFromFileName } from "@/components/payslip-import/mock-ocr-responses";
import type { PayslipHistoryEntry, PayslipOCRRaw, PayslipParsed } from "@/components/payslip-import/types";
import { formatMoney } from "@/lib/expense-utils";
import { FALLBACK_KRW_PER_NPR, getCachedExchangeRate } from "@/lib/exchange-rate";
import { useProductAuth } from "@/contexts/ProductAuthContext";

function fmtKrw(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString()} KRW`;
}

function row(label: string, value: string, sub?: string) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] py-2 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold tabular-nums text-emerald-50">{value}</span>
        {sub ? <p className="text-[10px] font-semibold text-emerald-200/45">{sub}</p> : null}
      </div>
    </div>
  );
}

export function KoreanPayslipImportPanel() {
  const { user } = useProductAuth();
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [ocrRaw, setOcrRaw] = useState<PayslipOCRRaw | null>(null);
  const [parsed, setParsed] = useState<PayslipParsed | null>(null);
  const [stagedId, setStagedId] = useState<string | null>(null);
  const [history, setHistory] = useState<PayslipHistoryEntry[]>([]);

  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);

  useEffect(() => {
    const snap = getCachedExchangeRate();
    if (snap?.krwPerNpr) setKrwPerNpr(snap.krwPerNpr);
    setHistory(loadPayslipHistoryState().entries);
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(loadPayslipHistoryState().entries);
  }, []);

  useEffect(() => {
    const onSync = () => refreshHistory();
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, onSync);
    return () => window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, onSync);
  }, [refreshHistory]);

  const analytics = useMemo(() => computePayslipTrendAnalytics(history), [history]);

  const previewNpr = useMemo(() => {
    if (!parsed) return { salary: 0, overtime: 0 };
    const ot = parsed.overtimePayKrw ?? 0;
    const gross = parsed.grossSalaryKrw;
    const net = parsed.netSalaryKrw;
    let baseKrw: number | null = null;
    if (gross != null && gross > 0) baseKrw = Math.max(0, gross - (ot > 0 ? ot : 0));
    else if (net != null && net > 0) baseKrw = Math.max(0, net - (ot > 0 ? ot : 0));
    const salaryNpr = baseKrw != null && baseKrw > 0 ? Math.round(krwToNpr(baseKrw, krwPerNpr)) : 0;
    const overtimeNpr = ot > 0 ? Math.round(krwToNpr(ot, krwPerNpr)) : 0;
    return { salary: salaryNpr, overtime: overtimeNpr };
  }, [parsed, krwPerNpr]);

  const runMockPipeline = useCallback(
    (file: File) => {
      setProcessing(true);
      setToast(null);
      window.setTimeout(() => {
        const raw = mockOcrFromFileName(file.name, file.type || "application/octet-stream");
        const p = parsePayslipFromOcr(raw);
        setOcrRaw(raw);
        setParsed(p);
        const saved = appendPayslipHistoryEntry({
          ocr: raw,
          parsed: p,
          applied: false,
          appliedSalaryNpr: null,
          appliedOvertimeNpr: null,
          krwPerNprUsed: null,
        });
        setStagedId(saved.id);
        refreshHistory();
        setProcessing(false);
        setToast({ tone: "ok", text: "Mock OCR pipeline finished — review fields, then apply to cashflow." });
      }, 720);
    },
    [refreshHistory],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (!f) return;
      const okMime =
        f.type.startsWith("image/") ||
        f.type === "application/pdf" ||
        f.type === "" ||
        Boolean(f.name.match(/\.(pdf|png|jpe?g|webp)$/i));
      if (!okMime) {
        setToast({ tone: "err", text: "Please drop a PDF or image payslip (mock mode accepts common extensions)." });
        return;
      }
      runMockPipeline(f);
    },
    [runMockPipeline],
  );

  const onApply = useCallback(() => {
    if (!parsed || !stagedId) {
      setToast({ tone: "err", text: "Extract a payslip first." });
      return;
    }
    const res = applyPayslipToCashflowStorage(parsed, krwPerNpr, user?.id);
    if (!res.ok) {
      setToast({ tone: "err", text: res.message });
      return;
    }
    markPayslipEntryApplied(stagedId, {
      appliedSalaryNpr: res.salaryNpr,
      appliedOvertimeNpr: res.overtimeNpr,
      krwPerNprUsed: krwPerNpr,
    });
    refreshHistory();
    setToast({ tone: "ok", text: res.message });
  }, [parsed, stagedId, krwPerNpr, refreshHistory, user?.id]);

  return (
    <div id="payslip-import" className="scroll-mt-24">
      <CashflowGlassCard
        title="Korean payslip import"
        subtitle="STEP 5A · Mock OCR + KRW→NPR bridge into cashflow (real OCR API later)."
        icon={FileScan}
        headerRight={
          <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-teal-100/90">
            Beta
          </span>
        }
      >
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed px-4 py-10 text-center transition duration-300 ${
            dragOver
              ? "border-cyan-400/55 bg-cyan-500/[0.08] shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]"
              : "border-emerald-400/25 bg-black/25 hover:border-emerald-400/40"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(52,211,153,0.12),transparent_55%)]" />
          <Upload className="relative mx-auto h-10 w-10 text-emerald-200/80" strokeWidth={1.75} />
          <p className="relative mt-3 text-sm font-black text-emerald-50">Drag & drop payslip</p>
          <p className="relative mt-1 text-[11px] font-semibold text-emerald-200/55">PDF or image · Korean E9-style mock extraction</p>
          <label className="relative mt-5 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-emerald-50 transition hover:border-emerald-300/50 hover:bg-emerald-500/25">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
            />
            Choose file
          </label>
          {processing ? (
            <p className="relative mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-cyan-200/80">
              <Wand2 className="h-4 w-4 animate-pulse" />
              Running mock OCR…
            </p>
          ) : null}
        </div>

        {toast ? (
          <div
            className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold leading-snug ${
              toast.tone === "ok"
                ? "border-emerald-400/25 bg-emerald-950/30 text-emerald-100/95"
                : "border-rose-400/30 bg-rose-950/25 text-rose-100/95"
            }`}
          >
            {toast.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {toast.text}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CashflowInsetCard>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-teal-200/70">
              <Sparkles className="h-3.5 w-3.5" />
              Parsed intelligence (KRW)
            </div>
            {!parsed ? (
              <p className="text-xs font-semibold text-emerald-200/50">Upload a payslip to populate structured fields.</p>
            ) : (
              <div className="space-y-0.5">
                {row("Employee", parsed.employeeName ?? "—")}
                {row("Company", parsed.companyName ?? "—")}
                {row("Pay date", parsed.payDate ?? "—")}
                {row("Gross", fmtKrw(parsed.grossSalaryKrw))}
                {row("Net", fmtKrw(parsed.netSalaryKrw))}
                {row("Overtime", fmtKrw(parsed.overtimePayKrw))}
                {row(
                  "Pension / Health / Tax",
                  `${fmtKrw(parsed.nationalPensionKrw)} · ${fmtKrw(parsed.healthInsuranceKrw)} · ${fmtKrw(parsed.taxKrw)}`,
                )}
                {row("Other deductions", fmtKrw(parsed.deductionsOtherKrw))}
                {row("Bonus", fmtKrw(parsed.bonusKrw))}
                <p className="pt-2 text-[10px] font-medium leading-relaxed text-emerald-200/45">
                  FX for apply uses cached KRW/NPR when available (~{krwPerNpr.toFixed(2)} KRW per 1 NPR). NPR is written to cashflow salary + overtime only.
                </p>
              </div>
            )}
          </CashflowInsetCard>

          <CashflowInsetCard>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-teal-200/70">
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics & automation
            </div>
            <div className="space-y-2 text-xs font-semibold text-emerald-100/90">
              <p>
                <span className="font-black text-teal-200">Imports:</span> {analytics.entryCount} on record
              </p>
              <p>
                <span className="font-black text-teal-200">Gross MoM:</span>{" "}
                {analytics.grossSalaryMoM_pct == null ? "—" : `${analytics.grossSalaryMoM_pct.toFixed(1)}%`}
              </p>
              <p>
                <span className="font-black text-teal-200">Overtime ÷ gross (avg):</span>{" "}
                {analytics.overtimeShareOfGross_avg == null
                  ? "—"
                  : `${(analytics.overtimeShareOfGross_avg * 100).toFixed(1)}%`}
              </p>
              <p>
                <span className="font-black text-teal-200">Deductions ÷ gross (avg):</span>{" "}
                {analytics.deductionsShareOfGross_avg == null
                  ? "—"
                  : `${(analytics.deductionsShareOfGross_avg * 100).toFixed(1)}%`}
              </p>
              <p>
                <span className="font-black text-teal-200">Net ÷ gross (avg):</span>{" "}
                {analytics.netToGross_avg == null ? "—" : `${(analytics.netToGross_avg * 100).toFixed(1)}%`}
              </p>
              <p className="rounded-lg border border-emerald-400/15 bg-black/30 p-2 text-[11px] font-medium leading-relaxed text-emerald-200/75">
                {analytics.savingsPotentialNote}
              </p>
            </div>
            {parsed ? (
              <div className="mt-3 space-y-2 border-t border-emerald-400/10 pt-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Cashflow preview (NPR)</p>
                <p className="text-sm font-black tabular-nums text-emerald-50">
                  Salary {formatMoney(previewNpr.salary, "NPR")} · OT {formatMoney(previewNpr.overtime, "NPR")}
                </p>
                <button
                  type="button"
                  onClick={onApply}
                  disabled={!stagedId}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 px-4 text-xs font-black uppercase tracking-wide text-cyan-50 transition hover:border-cyan-300/55 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply to cashflow
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/portfolio/simulation"
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[11px] font-black uppercase tracking-wide text-zinc-200 transition hover:border-white/20 hover:text-white"
                >
                  Open FIRE simulation
                </Link>
              </div>
            ) : null}
          </CashflowInsetCard>
        </div>

        {ocrRaw ? (
          <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-emerald-200/70">
            <summary className="cursor-pointer font-black uppercase tracking-wide text-emerald-200/80">Raw mock OCR</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-emerald-100/80">
              {JSON.stringify(ocrRaw.fields, null, 2)}
            </pre>
          </details>
        ) : null}
      </CashflowGlassCard>
    </div>
  );
}
