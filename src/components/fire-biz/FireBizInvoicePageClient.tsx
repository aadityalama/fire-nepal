"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FireBizEmptyState } from "@/components/fire-biz/FireBizUiPrimitives";
import { FireBizInvoiceView } from "@/components/fire-biz/FireBizInvoiceView";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";

export function FireBizInvoicePageClient({ saleId }: { saleId: string }) {
  const copy = useFireBizCopy();
  const { sales, loading } = useFireBiz();
  const sale = useMemo(() => sales.find((s) => s.id === saleId) ?? null, [sales, saleId]);

  if (loading) return <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>;
  if (!sale) {
    return (
      <div className="space-y-4">
        <FireBizEmptyState message={copy.invoice.notFound} />
        <Link href="/fire-biz/sales" className="text-sm font-bold text-emerald-400 hover:underline">← {copy.invoice.backToSales}</Link>
      </div>
    );
  }
  return <FireBizInvoiceView sale={sale} />;
}
