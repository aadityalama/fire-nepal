"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FireAiShell } from "@/components/fire-nepal-ai/FireAiShell";

export function FireAiLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullscreenChat = pathname === "/fire-ai/chat";

  return (
    <DashboardAccessGuard>
      {isFullscreenChat ? (
        <div className="min-h-[100dvh]">{children}</div>
      ) : (
        <FireAiShell>{children}</FireAiShell>
      )}
    </DashboardAccessGuard>
  );
}
