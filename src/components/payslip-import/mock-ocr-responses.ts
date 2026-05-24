import type { PayslipOCRRaw } from "@/components/payslip-import/types";

/** Deterministic mock: E9-style manufacturing payslip noise (no real PII). */
export function mockOcrFromFileName(fileName: string, mime: string): PayslipOCRRaw {
  const seed = fileName.length + mime.length;
  const variant = seed % 3;

  if (variant === 0) {
    return {
      sourceFileName: fileName,
      sourceMime: mime,
      extractedAt: new Date().toISOString(),
      fields: {
        companyName: "(주)데모로지스틱스  Daemo Logistics Co .,Ltd",
        employeeName: "NEPAL  KIM  DEMO",
        payDate: "지급일  2025. 03. 25  (20250325)",
        grossSalary: "총지급액  3,842,000",
        netSalary: "실수령액\n3,124,580 원",
        overtimePay: "연장수당  186,400",
        nationalPension: "국민연금  172,890",
        healthInsurance: "건강보험  122,540",
        tax: "소득세  158,200",
        deductionsOther: "고용보험  38,390  /  기타공제 12,000",
        bonus: "상여  0",
      },
    };
  }

  if (variant === 1) {
    return {
      sourceFileName: fileName,
      sourceMime: mime,
      extractedAt: new Date().toISOString(),
      fields: {
        companyName: "S-OIL  SERVICE  PARTNERS",
        employeeName: "PARK  S  (E-9)",
        payDate: "급여년월 2025-02",
        grossSalary: "급여총액 384.2만원",
        netSalary: "차인지급액 312만4580",
        overtimePay: "OT 18.6만",
        nationalPension: "국민연금17만2890",
        healthInsurance: "건강 122,540원",
        tax: "소득세 158200",
        deductionsOther: "지방소득세 15,820",
        bonus: "성과급 -",
      },
    };
  }

  return {
    sourceFileName: fileName,
    sourceMime: mime,
    extractedAt: new Date().toISOString(),
    fields: {
      companyName: "한국데모푸드 주식회사",
      employeeName: "DEMO  WORKER",
      payDate: "2025년 1월 10일",
      grossSalary: "3,650,000",
      netSalary: "2,980,000",
      overtimePay: "0",
      nationalPension: "164,250",
      healthInsurance: "116,800",
      tax: "149,500",
      deductionsOther: "39,450",
      bonus: "50,000",
    },
  };
}
