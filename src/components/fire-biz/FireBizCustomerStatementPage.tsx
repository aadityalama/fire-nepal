"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizEmptyState, FireBizGlassCard, FireBizPrimaryButton } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { buildCustomerStatement } from "@/lib/fire-biz/customer-statement";
import { downloadCustomerStatementPdf } from "@/lib/fire-biz/statement-pdf";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizCustomerStatementPage({ customerId }: { customerId: string }) {
  const copy = useFireBizCopy();
  const st = copy.statement;
  const { customers, sales, transactions, profile, loading } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [exporting, setExporting] = useState(false);

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const statement = useMemo(
    () => (customer ? buildCustomerStatement(customer, sales, transactions) : null),
    [customer, sales, transactions],
  );

  if (loading) return <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>;
  if (!customer || !statement) {
    return (
      <div className="space-y-4">
        <DashboardSectionHeader eyebrow={copy.moduleName} title={st.title} subtitle={st.subtitle} />
        <FireBizEmptyState message={st.notFound} />
        <Link href="/fire-biz/customers" className="text-sm font-bold text-emerald-400 hover:underline">← {st.backToCustomers}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={st.title} subtitle={customer.name} />
      <div className="flex flex-wrap gap-2">
        <FireBizPrimaryButton
          onClick={() => {
            setExporting(true);
            void downloadCustomerStatementPdf(statement, profile).finally(() => setExporting(false));
          }}
          disabled={exporting}
        >
          <Download size={16} className="mr-1.5 inline" />
          {exporting ? copy.common.loading : st.exportPdf}
        </FireBizPrimaryButton>
        <Link href="/fire-biz/customers" className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold text-emerald-400 hover:underline">
          ← {st.backToCustomers}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{st.totalDebit}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatBizNpr(statement.totalDebit)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{st.totalCredit}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatBizNpr(statement.totalCredit)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{st.outstanding}</p>
          <p className="mt-1 text-xl font-black tabular-nums text-rose-400">{formatBizNpr(statement.outstanding)}</p>
        </div>
      </div>

      <FireBizGlassCard title={st.ledger} icon={FileText}>
        {statement.entries.length === 0 ? (
          <FireBizEmptyState message={st.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${light ? "border-emerald-100 text-slate-500" : "border-emerald-400/20 text-emerald-200/60"}`}>
                  <th className="py-2 pr-3">{st.date}</th>
                  <th className="py-2 pr-3">{st.type}</th>
                  <th className="py-2 pr-3">{st.reference}</th>
                  <th className="py-2 pr-3 text-right">{st.debit}</th>
                  <th className="py-2 pr-3 text-right">{st.credit}</th>
                  <th className="py-2 text-right">{st.balance}</th>
                </tr>
              </thead>
              <tbody>
                {statement.entries.map((entry) => (
                  <tr key={entry.id} className={`border-b ${light ? "border-emerald-50" : "border-emerald-400/10"}`}>
                    <td className="py-2.5 pr-3">{entry.date}</td>
                    <td className="py-2.5 pr-3 capitalize">{entry.type}</td>
                    <td className="py-2.5 pr-3 font-semibold">{entry.reference}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{entry.debit ? formatBizNpr(entry.debit) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{entry.credit ? formatBizNpr(entry.credit) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold">{formatBizNpr(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FireBizGlassCard>
    </div>
  );
}
