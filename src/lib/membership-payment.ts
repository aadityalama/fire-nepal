import type { FireMembershipTier } from "@/lib/fire-membership";

export const MEMBERSHIP_PAYMENT_BUCKET = "membership_payment_proofs" as const;

export type MembershipRequestPlan = "premium" | "elite";

export type MembershipPaymentMethod = "khalti_qr" | "esewa_qr" | "global_ime_qr";

export const MEMBERSHIP_PLAN_PRICE_NPR: Record<MembershipRequestPlan, number> = {
  premium: 500,
  elite: 800,
};

export const PAYMENT_METHOD_LABEL: Record<MembershipPaymentMethod, string> = {
  khalti_qr: "Khalti QR",
  esewa_qr: "eSewa QR",
  global_ime_qr: "Global IME Bank QR",
};

/** Public or absolute URLs for QR artwork (env overrides, else bundled placeholders). */
export function membershipQrImageUrl(method: MembershipPaymentMethod): string {
  const env =
    method === "khalti_qr"
      ? process.env.NEXT_PUBLIC_MEMBERSHIP_QR_KHALTI
      : method === "esewa_qr"
        ? process.env.NEXT_PUBLIC_MEMBERSHIP_QR_ESEWA
        : process.env.NEXT_PUBLIC_MEMBERSHIP_QR_GLOBAL_IME;
  const trimmed = typeof env === "string" ? env.trim() : "";
  if (trimmed.length > 4) return trimmed;
  const fallback: Record<MembershipPaymentMethod, string> = {
    khalti_qr: "/payment-qr/khalti.png",
    esewa_qr: "/payment-qr/esewa-placeholder.svg",
    global_ime_qr: "/payment-qr/global-ime-placeholder.svg",
  };
  return fallback[method];
}

export function paymentInstructions(method: MembershipPaymentMethod, plan: MembershipRequestPlan): string[] {
  const amount = MEMBERSHIP_PLAN_PRICE_NPR[plan];
  const planLabel = plan === "premium" ? "Premium" : "Elite";
  const base = [
    `Send exactly NPR ${amount} for ${planLabel} (annual founder rate).`,
    "Include your FIRE Nepal account email in the payment note if the app allows it.",
    "After paying, upload a clear screenshot or receipt and add any transaction reference you received.",
  ];
  if (method === "khalti_qr") {
    return ["Open Khalti and scan the QR below.", ...base];
  }
  if (method === "esewa_qr") {
    return ["Open eSewa and scan the QR below.", ...base];
  }
  return ["Open Global IME Bank mobile banking and scan the QR below.", ...base];
}

export function tierToRequestPlan(tier: FireMembershipTier): MembershipRequestPlan | null {
  if (tier === "premium" || tier === "elite") return tier;
  return null;
}
