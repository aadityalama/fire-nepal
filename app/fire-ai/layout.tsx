import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FireAiLayoutClient } from "@/components/fire-nepal-ai/FireAiLayoutClient";

export const metadata: Metadata = {
  title: "FIRE AI | FIRE Nepal",
  description: "AI-powered financial assistant for Nepalis — insights, guidance, and conversation.",
};

export default function FireAiLayout({ children }: { children: ReactNode }) {
  return <FireAiLayoutClient>{children}</FireAiLayoutClient>;
}
