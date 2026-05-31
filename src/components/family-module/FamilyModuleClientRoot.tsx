"use client";

import { FamilyModuleProvider } from "@/contexts/FamilyModuleContext";
import { FamilyModuleShell } from "@/components/family-module/FamilyModuleShell";
import type { ReactNode } from "react";

export function FamilyModuleClientRoot({ children }: { children: ReactNode }) {
  return (
    <FamilyModuleProvider>
      <FamilyModuleShell>{children}</FamilyModuleShell>
    </FamilyModuleProvider>
  );
}
