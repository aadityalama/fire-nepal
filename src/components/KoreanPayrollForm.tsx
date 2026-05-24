"use client";

import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import type { KoreanPayrollExtract, PayrollFieldConfidences } from "@/lib/korean-payroll-types";

type KoreanPayrollFormProps = {
  payroll: KoreanPayrollExtract;
  confidences: PayrollFieldConfidences;
  /** 0–19 progressive reveal after OCR (one step per field row). */
  extractPhase: number;
  t: (key: string) => string;
  onPayrollPatch: (patch: Partial<KoreanPayrollExtract>) => void;
};

function num(
  k: keyof KoreanPayrollExtract,
  label: string,
  payroll: KoreanPayrollExtract,
  confidences: PayrollFieldConfidences,
  phase: number,
  idx: number,
  onPatch: (patch: Partial<KoreanPayrollExtract>) => void,
) {
  const v = payroll[k];
  const conf = confidences[k];
  const hidden = idx > phase;
  return (
    <label
      className={`block transition-all duration-300 ${hidden ? "pointer-events-none opacity-0 blur-[1px]" : "opacity-100"}`}
      style={{ transitionDelay: `${idx * 40}ms` }}
    >
      <span className="mb-1 flex items-center justify-between gap-2 text-xs font-black text-slate-600">
        <span>{label}</span>
        {typeof conf === "number" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">{conf}%</span>
        ) : null}
      </span>
      <NumericMoneyInput
        value={typeof v === "number" && Number.isFinite(v) ? v : undefined}
        onChange={(n) => onPatch({ [k]: n } as Partial<KoreanPayrollExtract>)}
        variant="integer"
        treatZeroAsEmpty={false}
        placeholder="Enter amount"
        wrapperClassName="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"
        inputClassName="min-w-0 w-full flex-1 bg-transparent text-sm font-bold text-emerald-950 outline-none"
      />
    </label>
  );
}

function txt(
  k: keyof KoreanPayrollExtract,
  label: string,
  payroll: KoreanPayrollExtract,
  confidences: PayrollFieldConfidences,
  phase: number,
  idx: number,
  onPatch: (patch: Partial<KoreanPayrollExtract>) => void,
) {
  const v = payroll[k];
  const conf = confidences[k];
  const hidden = idx > phase;
  return (
    <label
      className={`block transition-all duration-300 ${hidden ? "pointer-events-none opacity-0 blur-[1px]" : "opacity-100"}`}
      style={{ transitionDelay: `${idx * 40}ms` }}
    >
      <span className="mb-1 flex items-center justify-between gap-2 text-xs font-black text-slate-600">
        <span>{label}</span>
        {typeof conf === "number" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">{conf}%</span>
        ) : null}
      </span>
      <input
        value={typeof v === "string" ? v : ""}
        onChange={(e) => onPatch({ [k]: e.target.value || undefined } as Partial<KoreanPayrollExtract>)}
        className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-emerald-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

export function KoreanPayrollForm({ payroll, confidences, extractPhase, t, onPayrollPatch }: KoreanPayrollFormProps) {
  let i = 0;
  const next = () => i++;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-800">{t("pfSecEmployee")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {txt("employeeName", t("pfName"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {txt("employeeNo", t("pfEmpNo"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {txt("hireDateRaw", t("pfHireDate"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {txt("department", t("pfDept"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-800">{t("pfSecIncome")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {num("basePay", t("pfBasePay"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("overtimePay", t("pfOvertimePay"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("holidayPay", t("pfHolidayPay"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("nightPay", t("pfNightPay"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("bonusPay", t("pfBonus"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("paymentTotal", t("pfPaymentTotal"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-800">{t("pfSecDeduction")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {num("nationalPension", t("pfNpEmp"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("nationalPensionEmployer", t("pfNpBiz"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("healthInsurance", t("pfHealth"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("longTermCareInsurance", t("pfLtci"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("employmentInsurance", t("pfEmpIns"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("incomeTax", t("pfIncomeTax"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("localIncomeTax", t("pfLocalTax"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("deductionTotal", t("pfDeductionTotal"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-800">{t("pfSecNet")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {num("netAfterDeductions", t("pfNetAfter"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
          {num("netPaid", t("pfNetPaid"), payroll, confidences, extractPhase, next(), onPayrollPatch)}
        </div>
      </div>

      <p className="text-[11px] font-bold leading-relaxed text-slate-500">{t("pfManualHint")}</p>
    </div>
  );
}
