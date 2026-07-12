import type { Metadata } from "next";
import { PrivacyFooterInfoPage } from "@/components/footer-info/FooterInfoPage";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Privacy Policy | FIRE Nepal",
  description:
    "Review how FIRE Nepal handles data collection, financial data security, OCR payslip privacy, cookies, analytics, third-party services, and deletion requests.",
  alternates: buildCanonicalAlternates("/privacy"),
};

export default function PrivacyPage() {
  return <PrivacyFooterInfoPage />;
}
