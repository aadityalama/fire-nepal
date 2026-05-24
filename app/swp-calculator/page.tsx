import type { Metadata } from "next";
import { SwpCalculator } from "@/components/SwpCalculator";

export const metadata: Metadata = {
  title: "SWP Calculator | FIRE Nepal",
  description:
    "Premium systematic withdrawal planner with KRW & NPR support, inflation modeling, sustainability score, and FIRE-safe withdrawal insights.",
};

export default function SwpCalculatorPage() {
  return <SwpCalculator />;
}
