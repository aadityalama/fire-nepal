import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HubLayoutClient } from "@/components/product/hub/HubLayoutClient";

export const metadata: Metadata = {
  title: "Hub | FIRE Nepal",
  description: "Premium workspace — portfolio, simulation, cashflow, OCR, and intelligence in one navigation shell.",
};

export default function HubLayout({ children }: { children: ReactNode }) {
  return <HubLayoutClient>{children}</HubLayoutClient>;
}
