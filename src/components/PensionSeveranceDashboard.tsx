"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import {
  ArrowLeft,
  Bot,
  Building2,
  Camera,
  Download,
  FileUp,
  Globe2,
  ImagePlus,
  LineChart,
  Shield,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Line } from "react-chartjs-2";
import { buildPensionAiInsights } from "@/lib/pension-ai-insights";
import { fetchLiveExchangeRate, krwToNpr } from "@/lib/exchange-rate";
import { pensionT } from "@/lib/pension-i18n";
import { SlipCornerPickerModal } from "@/components/SlipCornerPickerModal";
import { FireFeatureGate } from "@/components/membership/FireFeatureGate";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { runKoreanSalarySlipOcr } from "@/lib/korean-slip-ocr";
import { parsePensionSlipFromOcrText, slipParseStats } from "@/lib/pension-slip-parser";
import {
  averageGrossFromSlips,
  estimateSeveranceBallpark,
  monthsBetweenUtc,
  totalDeductionsEstimate,
  totalNationalPensionFromSlip,
} from "@/lib/pension-severance-math";
import { downloadPensionReportPdf, estimateSeveranceYoYDelta } from "@/lib/pension-pdf-export";
import { loadPensionState, savePensionState } from "@/lib/pension-storage";
import { canAccessFeature } from "@/lib/fire-membership";
import type { PensionDashboardState, PensionLocale, PensionSlipFields, SalarySlipRecord } from "@/lib/pension-types";
import {
  MAX_RECEIPT_UPLOAD_BYTES,
  compressReceiptImage,
  formatBytes,
  isHeicLike,
  isReceiptImageFile,
} from "@/lib/expense-receipts";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const GALLERY_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*";
const CAMERA_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

function emptyFields(): PensionSlipFields {
  return {};
}

function newSlipId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `slip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PensionSeveranceDashboard() {
  const { tier } = useFireMembership();
  const pdfOk = canAccessFeature(tier, "pdf_reports");
  const [hydrated, setHydrated] = useState(false);
  const [locale, setLocale] = useState<PensionLocale>("en");
  const [state, setState] = useState<PensionDashboardState>(() => ({
    version: 1,
    profile: { joinDate: new Date(new Date().getFullYear() - 3, 0, 2).toISOString().slice(0, 10) },
    slips: [],
  }));
  const [krwPerNpr, setKrwPerNpr] = useState(9.27);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [periodYm, setPeriodYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fields, setFields] = useState<PensionSlipFields>(emptyFields);
  const [rawOcr, setRawOcr] = useState("");
  const [slipPreview, setSlipPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [ocrStage, setOcrStage] = useState<"idle" | "heic" | "optimize" | "ocr">("idle");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [parseFill, setParseFill] = useState<{ filled: number; total: number } | null>(null);
  const [cornerModalOpen, setCornerModalOpen] = useState(false);

  const id = useId();
  const galleryInputId = `pension-slip-gallery-${id}`;
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => pensionT(locale, key, vars), [locale]);

  useEffect(() => {
    setHydrated(true);
    setState(loadPensionState());
    void fetchLiveExchangeRate()
      .then((r) => setKrwPerNpr(r.krwPerNpr))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePensionState(state);
  }, [state, hydrated]);

  const sortedSlips = useMemo(
    () => [...state.slips].sort((a, b) => a.periodYm.localeCompare(b.periodYm)),
    [state.slips],
  );

  const latest = sortedSlips[sortedSlips.length - 1];
  const npLatest = latest ? totalNationalPensionFromSlip(latest.fields) : { employee: 0, employer: 0, total: 0 };

  const avgGross = useMemo(() => averageGrossFromSlips(sortedSlips, 3), [sortedSlips]);
  const lastYm = latest?.periodYm ?? state.profile.joinDate.slice(0, 7);
  const tenureMonths = monthsBetweenUtc(state.profile.joinDate, `${lastYm}-28`);
  const severanceToday = estimateSeveranceBallpark(avgGross, tenureMonths);
  const severanceFuture = estimateSeveranceBallpark(avgGross, tenureMonths + 24);
  const yoyDelta = estimateSeveranceYoYDelta(sortedSlips, state.profile.joinDate);

  const cumulativePensionSeries = useMemo(() => {
    let cum = 0;
    return sortedSlips.map((s) => {
      cum += totalNationalPensionFromSlip(s.fields).total;
      return { ym: s.periodYm, cum, gross: s.fields.grossSalary ?? 0 };
    });
  }, [sortedSlips]);

  const severanceSeries = useMemo(() => {
    return sortedSlips.map((s) => {
      const tMonths = monthsBetweenUtc(state.profile.joinDate, `${s.periodYm}-28`);
      const avg = averageGrossFromSlips(
        sortedSlips.filter((x) => x.periodYm <= s.periodYm),
        3,
      );
      return { ym: s.periodYm, sev: estimateSeveranceBallpark(avg, tMonths) };
    });
  }, [sortedSlips, state.profile.joinDate]);

  const insights = useMemo(
    () => buildPensionAiInsights(locale, sortedSlips, state.profile.joinDate),
    [locale, sortedSlips, state.profile.joinDate],
  );

  const totalPensionContributions = sortedSlips.reduce(
    (acc, s) => acc + totalNationalPensionFromSlip(s.fields).total,
    0,
  );
  const totalRetirementModel = totalPensionContributions + severanceToday;

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          align: "start" as const,
          labels: {
            boxWidth: 10,
            color: "#1e3a2f",
            font: { size: 11, weight: "bold" as const },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 63, 47, 0.92)",
          cornerRadius: 12,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const v = Number(ctx.parsed.y);
              return ` ${ctx.dataset.label}: ₩${v.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b", maxRotation: 45 } },
        y: {
          grid: { color: "rgba(0, 63, 47, 0.06)" },
          ticks: {
            color: "#64748b",
            callback: (v: string | number) => `₩${Number(v).toLocaleString()}`,
          },
        },
      },
    }),
    [],
  );

  const salaryChart = useMemo(
    () => ({
      labels: cumulativePensionSeries.map((r) => r.ym),
      datasets: [
        {
          label: t("chartSalary"),
          data: cumulativePensionSeries.map((r) => r.gross),
          borderColor: "#007a3d",
          backgroundColor: "rgba(0, 122, 61, 0.1)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
        },
      ],
    }),
    [cumulativePensionSeries, t],
  );

  const pensionCumChart = useMemo(
    () => ({
      labels: cumulativePensionSeries.map((r) => r.ym),
      datasets: [
        {
          label: t("chartPension"),
          data: cumulativePensionSeries.map((r) => r.cum),
          borderColor: "#0f766e",
          backgroundColor: "rgba(15, 118, 110, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
        },
      ],
    }),
    [cumulativePensionSeries, t],
  );

  const severanceChart = useMemo(
    () => ({
      labels: severanceSeries.map((r) => r.ym),
      datasets: [
        {
          label: t("chartSeverance"),
          data: severanceSeries.map((r) => r.sev),
          borderColor: "#d6a83e",
          backgroundColor: "rgba(214, 168, 62, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
        },
      ],
    }),
    [severanceSeries, t],
  );

  const runOcrPipeline = useCallback(async (dataUrl: string) => {
    setOcrStage("ocr");
    const r = await runKoreanSalarySlipOcr(dataUrl);
    setRawOcr(r.text);
    setOcrConfidence(r.confidence);
    const parsed = parsePensionSlipFromOcrText(r.text);
    setFields(parsed);
    const st = slipParseStats(parsed);
    setParseFill({ filled: st.filledCount, total: st.totalKeys });
  }, []);

  const processSlipFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setOcrError(null);
      setOcrConfidence(null);
      setParseFill(null);
      if (!isReceiptImageFile(file)) {
        setOcrError(t("invalidImageType"));
        return;
      }
      if (file.size > MAX_RECEIPT_UPLOAD_BYTES) {
        setOcrError(
          t("fileTooLarge", {
            size: formatBytes(file.size),
            max: formatBytes(MAX_RECEIPT_UPLOAD_BYTES),
          }),
        );
        return;
      }
      setOcrBusy(true);
      const heic = isHeicLike(file);
      setOcrStage(heic ? "heic" : "optimize");
      try {
        const result = await compressReceiptImage(file);
        setSlipPreview(result.dataUrl);
        await runOcrPipeline(result.dataUrl);
      } catch (e) {
        setOcrError(e instanceof Error ? e.message : "OCR failed");
      } finally {
        setOcrBusy(false);
        setOcrStage("idle");
      }
    },
    [t, runOcrPipeline],
  );

  async function onGalleryChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    await processSlipFile(file);
    e.target.value = "";
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setDragging(true);
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setDragging(false);
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setDragging(false);
    await processSlipFile(ev.dataTransfer.files?.[0]);
  }

  function persistSlip() {
    const slip: SalarySlipRecord = {
      id: newSlipId(),
      uploadedAt: new Date().toISOString(),
      periodYm,
      rawOcrText: rawOcr || undefined,
      fields: { ...fields },
    };
    setState((prev) => ({
      ...prev,
      slips: [...prev.slips.filter((s) => s.periodYm !== periodYm), slip].sort((a, b) =>
        a.periodYm.localeCompare(b.periodYm),
      ),
    }));
    setRawOcr("");
    setFields(emptyFields());
    setSlipPreview("");
    setOcrConfidence(null);
    setParseFill(null);
  }

  function removeSlip(id: string) {
    setState((prev) => ({ ...prev, slips: prev.slips.filter((s) => s.id !== id) }));
  }

  async function exportPdf() {
    const insightsEn = buildPensionAiInsights("en", sortedSlips, state.profile.joinDate);
    await downloadPensionReportPdf(state, { krwPerNpr, insights: insightsEn });
  }

  const fieldNum = (key: keyof PensionSlipFields, label: string) => {
    const raw = fields[key];
    const numVal = typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
    return (
      <label className="block">
        <span className="mb-1.5 block text-sm font-black text-slate-600">{label}</span>
        <NumericMoneyInput
          value={numVal}
          onChange={(n) => {
            if (n === undefined) {
              setFields((f) => {
                const next = { ...f };
                delete next[key];
                return next;
              });
              return;
            }
            setFields((f) => ({ ...f, [key]: Math.round(n) }));
          }}
          variant="integer"
          treatZeroAsEmpty={false}
          placeholder="Enter amount"
          wrapperClassName="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
          inputClassName="min-w-0 w-full flex-1 bg-transparent text-base font-bold text-emerald-950 outline-none"
        />
      </label>
    );
  };

  return (
    <main className="premium-shell min-h-screen bg-[#f4fbf6] px-4 pb-24 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} /> {t("back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-500">{t("localeLabel")}</span>
            {(["en", "ko", "ne"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`rounded-full px-3 py-2 text-sm font-black transition ${
                  locale === l ? "bg-emerald-700 text-white shadow" : "border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <section className="dark-glass-card relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-emerald-100">
                <Building2 size={18} /> FIRE Nepal
              </div>
              <h1 className="text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl md:text-5xl">{t("title")}</h1>
              <p className="mt-4 text-base leading-relaxed text-emerald-50/88 sm:text-lg">{t("subtitle")}</p>
            </div>
            {pdfOk ? (
              <button
                type="button"
                onClick={() => void exportPdf()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-emerald-900 shadow-lg transition hover:-translate-y-0.5"
              >
                <Download size={18} /> {t("exportPdf")}
              </button>
            ) : (
              <Link
                href="/dashboard/membership"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-black text-white shadow-lg backdrop-blur transition hover:bg-white/15"
              >
                <Download size={18} /> Unlock PDF (Premium)
              </Link>
            )}
          </div>
        </section>

        <p className="mt-4 text-center text-sm font-bold text-slate-600 sm:text-left">{t("disclaimer")}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="glass-card rounded-[1.7rem] p-5 sm:p-6 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950 sm:text-2xl">
              <FileUp className="text-emerald-700" size={22} />
              {t("uploadTitle")}
            </h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">{t("uploadHint")}</p>

            <FireFeatureGate
              feature="ocr_payslip"
              surface="light"
              title="OCR payslip import"
              description="Premium unlocks camera / gallery upload, HEIC conversion, and Korean payslip OCR. You can still enter slip fields manually below."
            >
            <input
              ref={galleryInputRef}
              id={galleryInputId}
              type="file"
              accept={GALLERY_ACCEPT}
              className="sr-only"
              onChange={(e) => void onGalleryChange(e)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept={CAMERA_ACCEPT}
              capture="environment"
              className="sr-only"
              onChange={(e) => void onGalleryChange(e)}
            />

            <div className="mt-5 space-y-3">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    galleryInputRef.current?.click();
                  }
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={(e) => void onDrop(e)}
                onClick={() => !ocrBusy && galleryInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 sm:py-8 ${
                  ocrBusy ? "cursor-wait opacity-70" : ""
                } ${
                  dragging
                    ? "scale-[1.01] border-emerald-500 bg-emerald-50"
                    : "border-emerald-200 bg-white/90 hover:border-emerald-400 hover:bg-emerald-50/60"
                }`}
              >
                <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  {ocrBusy ? <Upload className="animate-bounce" size={24} /> : <ImagePlus size={24} />}
                </div>
                <p className="font-black text-emerald-950">{ocrBusy ? t("uploadProcessing") : t("uploadTap")}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{t("uploadDropDetail")}</p>
                {ocrBusy ? (
                  <p className="mt-2 text-xs font-black text-emerald-800">
                    {ocrStage === "heic" ? t("ocrHeic") : ocrStage === "optimize" ? t("ocrOptimizing") : t("ocrRunning")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={ocrBusy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 py-3 text-sm font-black text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera size={18} strokeWidth={2.5} />
                {t("useCamera")}
              </button>
            </div>

            {slipPreview ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white/90 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slipPreview}
                  alt=""
                  decoding="async"
                  className="mx-auto max-h-48 w-full object-contain"
                />
                <p className="mt-2 text-center text-[11px] font-bold text-emerald-800">{t("slipPreviewCaption")}</p>
                {slipPreview && !ocrBusy ? (
                  <button
                    type="button"
                    onClick={() => setCornerModalOpen(true)}
                    className="mt-2 w-full rounded-xl border border-emerald-300 bg-white py-2 text-xs font-black text-emerald-900 transition hover:bg-emerald-50"
                  >
                    {t("adjustCorners")}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={ocrBusy || !rawOcr}
                onClick={() => {
                  if (rawOcr) {
                    const p = parsePensionSlipFromOcrText(rawOcr);
                    setFields(p);
                    const st = slipParseStats(p);
                    setParseFill({ filled: st.filledCount, total: st.totalKeys });
                  }
                }}
                className="rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 transition enabled:hover:bg-emerald-50 disabled:opacity-40"
              >
                {t("runOcr")}
              </button>
            </div>
            {ocrError ? <p className="mt-3 text-sm font-black text-red-600">{ocrError}</p> : null}
            {ocrConfidence !== null && !ocrError ? (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/90 px-4 py-3 shadow-sm">
                <p className="text-sm font-black text-emerald-950">
                  {t("ocrConfidenceLine", {
                    pct: ocrConfidence,
                    tier: t(
                      ocrConfidence >= 72
                        ? "ocrTierExcellent"
                        : ocrConfidence >= 55
                          ? "ocrTierGood"
                          : ocrConfidence >= 40
                            ? "ocrTierFair"
                            : "ocrTierLow",
                    ),
                  })}
                </p>
                {parseFill ? (
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {t("parseFieldsDetected", { filled: parseFill.filled, total: parseFill.total })}
                  </p>
                ) : null}
              </div>
            ) : null}

            </FireFeatureGate>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-black text-slate-600">{t("periodYm")}</span>
                <input
                  value={periodYm}
                  onChange={(e) => setPeriodYm(e.target.value)}
                  className="w-full max-w-xs rounded-2xl border border-emerald-100 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              {fieldNum("grossSalary", t("gross"))}
              {fieldNum("baseSalary", t("base"))}
              {fieldNum("overtime", t("overtime"))}
              {fieldNum("bonus", t("bonus"))}
              {fieldNum("nationalPensionEmployee", t("npEmp"))}
              {fieldNum("nationalPensionEmployer", t("npBiz"))}
              {fieldNum("healthInsurance", t("health"))}
              {fieldNum("employmentInsurance", t("empIns"))}
              {fieldNum("incomeTax", t("tax"))}
              {fieldNum("localIncomeTax", t("localTax"))}
              {fieldNum("severanceReserve", t("sevReserve"))}
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-black text-slate-600">{t("rawOcr")}</span>
              <textarea
                value={rawOcr}
                onChange={(e) => setRawOcr(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-sm font-bold text-emerald-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <button
              type="button"
              onClick={persistSlip}
              className="mt-5 w-full rounded-2xl bg-emerald-700 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-800 sm:w-auto sm:px-10"
            >
              {t("saveSlip")}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="glass-card rounded-[1.7rem] p-5 sm:p-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-slate-600">{t("joinDate")}</span>
                <input
                  type="date"
                  value={state.profile.joinDate}
                  onChange={(e) =>
                    setState((s) => ({ ...s, profile: { ...s.profile, joinDate: e.target.value } }))
                  }
                  className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-black text-slate-600">{t("employer")}</span>
                <input
                  value={state.profile.employerName ?? ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      profile: { ...s.profile, employerName: e.target.value || undefined },
                    }))
                  }
                  className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
            <div className="glass-card flex flex-1 flex-col rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <Bot size={20} />
                <p className="text-sm font-black uppercase tracking-wide">{t("aiTitle")}</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm font-bold leading-relaxed text-slate-700">
                {insights.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <Sparkles className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100/80 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("pensionMonth")}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{t("empDep")}</p>
            <p className="text-xl font-black tracking-tight text-emerald-950">₩{npLatest.employee.toLocaleString()}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">{t("coDep")}</p>
            <p className="text-xl font-black tracking-tight text-emerald-800">₩{npLatest.employer.toLocaleString()}</p>
            <p className="mt-3 text-xs font-black uppercase text-emerald-700">{t("totalPension")}</p>
            <p className="text-2xl font-black text-emerald-900">₩{npLatest.total.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100/80 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("severanceTitle")}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-emerald-950">₩{severanceToday.toLocaleString()}</p>
            <p className="mt-2 text-xs font-bold leading-snug text-slate-500">{t("severanceHint")}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">{t("payoutToday")}</p>
            <p className="text-sm font-black text-emerald-800">₩{severanceFuture.toLocaleString()} ({t("futureProj")})</p>
          </div>
          <div className="rounded-2xl border border-emerald-100/80 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("yearlyIncrease")}</p>
            <p className={`mt-2 text-2xl font-black ${yoyDelta >= 0 ? "text-emerald-800" : "text-red-600"}`}>
              {yoyDelta >= 0 ? "+" : ""}₩{yoyDelta.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100/80 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("totalAccum")}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-emerald-950">₩{totalRetirementModel.toLocaleString()}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{t("nprTitle")}</p>
            <p className="text-lg font-black text-emerald-800">रु {Math.round(krwToNpr(totalRetirementModel, krwPerNpr)).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{t("nprHint")}</p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-emerald-950 sm:text-2xl">
            <LineChart className="text-emerald-700" size={24} />
            {t("chartsTitle")}
          </h2>
          {sortedSlips.length === 0 ? (
            <div className="rounded-[1.7rem] border border-dashed border-emerald-200 bg-emerald-50/50 p-10 text-center text-sm font-bold text-slate-600">
              {t("noSlips")}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="glass-card rounded-[1.7rem] p-4 sm:p-5">
                <div className="mb-3 h-56 sm:h-64">
                  <Line data={salaryChart} options={chartOptions} />
                </div>
              </div>
              <div className="glass-card rounded-[1.7rem] p-4 sm:p-5">
                <div className="mb-3 h-56 sm:h-64">
                  <Line data={pensionCumChart} options={chartOptions} />
                </div>
              </div>
              <div className="glass-card rounded-[1.7rem] p-4 sm:p-5">
                <div className="mb-3 h-56 sm:h-64">
                  <Line data={severanceChart} options={chartOptions} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10 glass-card rounded-[1.7rem] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950 sm:text-xl">
            <Globe2 className="text-emerald-700" size={22} />
            {t("slipsTitle")}
          </h2>
          {sortedSlips.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-slate-600">{t("noSlips")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedSlips.map((s) => {
                const np = totalNationalPensionFromSlip(s.fields);
                const ded = totalDeductionsEstimate(s.fields);
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 rounded-2xl border border-emerald-50/90 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-emerald-950">{s.periodYm}</p>
                      <p className="text-sm font-bold text-slate-600">
                        Gross ₩{(s.fields.grossSalary ?? 0).toLocaleString()} · NP total ₩{np.total.toLocaleString()} ·
                        Deductions ~₩{ded.toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlip(s.id)}
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 sm:self-auto"
                    >
                      <Trash2 size={16} /> {t("delete")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-bold text-emerald-900">
          <Shield className="mt-0.5 shrink-0 text-emerald-700" size={20} />
          <span>{t("disclaimer")}</span>
        </div>
      </div>

      {slipPreview ? (
        <SlipCornerPickerModal
          open={cornerModalOpen}
          imageDataUrl={slipPreview}
          copy={{
            title: t("cornerTitle"),
            hint: t("cornerHint"),
            reset: t("cornerReset"),
            cancel: t("cornerCancel"),
            apply: t("cornerApply"),
          }}
          onClose={() => setCornerModalOpen(false)}
          onApply={async (warped) => {
            setSlipPreview(warped);
            setOcrError(null);
            setOcrBusy(true);
            try {
              await runOcrPipeline(warped);
            } catch (e) {
              setOcrError(e instanceof Error ? e.message : "OCR failed");
            } finally {
              setOcrBusy(false);
              setOcrStage("idle");
            }
          }}
        />
      ) : null}
    </main>
  );
}
