import type { BusinessProfileRow, SaleRow } from "@/lib/fire-biz/types";

export type PaymentQrMethod = "esewa" | "khalti";

export type PaymentQrInfo = {
  method: PaymentQrMethod;
  label: string;
  amount: number;
  merchantId: string | null;
  qrUrl: string | null;
  payload: string;
};

export function buildPaymentQrPayload(
  method: PaymentQrMethod,
  amount: number,
  merchantId: string | null,
  invoiceNumber: string | null,
): string {
  const amt = amount.toFixed(2);
  const inv = invoiceNumber ?? "INV";
  if (method === "esewa") {
    return merchantId
      ? `esewa://pay?amt=${amt}&merchant=${encodeURIComponent(merchantId)}&invoice=${encodeURIComponent(inv)}`
      : `FIRE-Nepal-eSewa:${amt}:${inv}`;
  }
  return merchantId
    ? `khalti://pay?amount=${amt}&merchant=${encodeURIComponent(merchantId)}&reference=${encodeURIComponent(inv)}`
    : `FIRE-Nepal-Khalti:${amt}:${inv}`;
}

export function getPaymentQrOptions(
  profile: BusinessProfileRow | null,
  sale: SaleRow,
): PaymentQrInfo[] {
  const due = Math.max(0, Number(sale.total_amount) - Number(sale.amount_paid));
  if (due <= 0) return [];

  const invoiceNumber = sale.invoice_number;
  const options: PaymentQrInfo[] = [];

  if (profile?.esewa_qr_url || profile?.esewa_merchant_id) {
    options.push({
      method: "esewa",
      label: "eSewa",
      amount: due,
      merchantId: profile.esewa_merchant_id,
      qrUrl: profile.esewa_qr_url,
      payload: buildPaymentQrPayload("esewa", due, profile.esewa_merchant_id, invoiceNumber),
    });
  }

  if (profile?.khalti_qr_url || profile?.khalti_merchant_id) {
    options.push({
      method: "khalti",
      label: "Khalti",
      amount: due,
      merchantId: profile.khalti_merchant_id,
      qrUrl: profile.khalti_qr_url,
      payload: buildPaymentQrPayload("khalti", due, profile.khalti_merchant_id, invoiceNumber),
    });
  }

  return options;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(payload, {
    width: 220,
    margin: 2,
    color: { dark: "#064e3b", light: "#ffffff" },
  });
}
