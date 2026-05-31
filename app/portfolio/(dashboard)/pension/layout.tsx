import type { Metadata } from "next";
import { SsfPensionProvider } from "@/contexts/SsfPensionContext";

export const metadata: Metadata = {
  title: "Pension | Portfolio | FIRE Nepal",
  description:
    "Unified Pension workspace — SSF, EPF, CIT, retirement projection, benefits, withdrawal planning, and family protection inside the wealth dashboard.",
};

export default function PensionLayout({ children }: { children: React.ReactNode }) {
  return <SsfPensionProvider>{children}</SsfPensionProvider>;
}
