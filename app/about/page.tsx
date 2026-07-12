import type { Metadata } from "next";
import { AboutFooterInfoPage } from "@/components/footer-info/FooterInfoPage";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "About FIRE Nepal",
  description:
    "Learn how FIRE Nepal helps Nepalis living, working and studying abroad achieve financial independence, plan retirement, and return to Nepal with confidence.",
  alternates: buildCanonicalAlternates("/about"),
};

export default function AboutPage() {
  return <AboutFooterInfoPage />;
}
