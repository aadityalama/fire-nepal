import { Suspense } from "react";
import { NepseHubAdminClient } from "@/components/admin/NepseHubAdminClient";

export default function NepseHubAdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading NEPSE Hub Admin…</div>}>
      <NepseHubAdminClient />
    </Suspense>
  );
}
