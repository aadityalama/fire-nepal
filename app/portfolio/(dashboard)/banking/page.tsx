import type { Metadata } from "next";
import { PortfolioBankingPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Banking & Cash | Portfolio | FIRE Nepal",
  description: "Liquid cash, fixed deposits, and banking lines in NPR, KRW, and USD.",
};

export default function Page() {
  return <PortfolioBankingPage />;
}
