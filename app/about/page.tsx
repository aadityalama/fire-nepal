import type { Metadata } from "next";
import { AboutFooterInfoPage } from "@/components/footer-info/FooterInfoPage";

export const metadata: Metadata = {
  title: "About FIRE Nepal | FIRE Nepal",
  description:
    "Learn how FIRE Nepal helps Nepali workers abroad achieve financial independence, plan retirement, and return to Nepal with confidence.",
};

export default function AboutPage() {
  return <AboutFooterInfoPage />;
}
