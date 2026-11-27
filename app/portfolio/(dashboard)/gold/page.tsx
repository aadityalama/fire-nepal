import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { PortfolioGoldPage } from "@/components/portfolio/portfolio-route-views";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-gs-premium",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gold & Silver | Portfolio | FIRE Nepal",
  description: "Gold and silver holdings with NPR marks and ledger sync.",
};

export default function Page() {
  return (
    <div className={`${manrope.variable} gs-premium-root min-w-0`}>
      <PortfolioGoldPage />
    </div>
  );
}
