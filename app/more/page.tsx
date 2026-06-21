import type { Metadata } from "next";
import { HubLayoutClient } from "@/components/product/hub/HubLayoutClient";
import { MorePagePanel } from "@/components/product/shell/ProductAppShell";

export const metadata: Metadata = {
  title: "More | FIRE Nepal",
  description: "Account, family modules, reminders, and settings.",
};

export default function MorePage() {
  return (
    <HubLayoutClient>
      <MorePagePanel />
    </HubLayoutClient>
  );
}
