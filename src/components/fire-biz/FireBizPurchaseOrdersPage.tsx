"use client";

import { ClipboardList, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizInput,
  FireBizPageActions,
  FireBizPrimaryButton,
  FireBizSecondaryButton,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import type { PurchaseOrderStatus } from "@/lib/fire-biz/types";

const STATUSES: PurchaseOrderStatus[] = ["draft", "sent", "partial", "received", "cancelled"];

export function FireBizPurchaseOrdersPage() {
  const copy = useFireBizCopy();
  const po = copy.purchaseOrders;
  const { purchaseOrders, suppliers, loading, savePurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const total = Number(totalAmount);
    if (!total || total <= 0) {
      toast.error(po.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      await savePurchaseOrder({
        po_number: poNumber || `PO-${Date.now().toString().slice(-6)}`,
        supplier_id: supplierId || null,
        order_date: orderDate,
        expected_date: expectedDate || null,
        status: "draft",
        subtotal: total,
        tax_amount: 0,
        total_amount: total,
        line_items: [{ name: po.generalItems, quantity: 1, unitPrice: total }],
        notes: notes || null,
      });
      toast.success(po.created);
      setPoNumber("");
      setSupplierId("");
      setTotalAmount("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={po.title} subtitle={po.subtitle} />
      <FireBizPageActions>
        <FireBizPrimaryButton type="button" onClick={() => document.getElementById("po-form")?.scrollIntoView({ behavior: "smooth" })}>
          {po.newPo}
        </FireBizPrimaryButton>
      </FireBizPageActions>

      <FireBizGlassCard title={po.create} icon={ClipboardList}>
        <form id="po-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
          <FireBizInput label={po.poNumber} value={poNumber} onChange={setPoNumber} />
          <label className="block">
            <span className={`mb-1 block text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{po.supplier}</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                light ? "border-emerald-200/80 bg-white text-slate-900" : "border-emerald-400/20 bg-black/30 text-white"
              }`}
            >
              <option value="">{po.selectSupplier}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <FireBizInput label={po.orderDate} value={orderDate} onChange={setOrderDate} type="date" />
          <FireBizInput label={po.expectedDate} value={expectedDate} onChange={setExpectedDate} type="date" />
          <FireBizInput label={po.totalAmount} value={totalAmount} onChange={setTotalAmount} type="number" />
          <FireBizInput label={po.notes} value={notes} onChange={setNotes} />
          <div className="sm:col-span-2">
            <FireBizPrimaryButton type="submit" disabled={saving}>{saving ? copy.common.loading : po.save}</FireBizPrimaryButton>
          </div>
        </form>
      </FireBizGlassCard>

      <FireBizGlassCard title={po.list} icon={ClipboardList}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : purchaseOrders.length === 0 ? (
          <FireBizEmptyState message={po.empty} />
        ) : (
          <ul className="space-y-2">
            {purchaseOrders.map((row) => (
              <li key={row.id} className={`rounded-xl border px-3 py-3 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{row.po_number ?? row.id.slice(0, 8)}</p>
                    <p className="text-[11px] opacity-70">
                      {row.order_date} · {supplierMap.get(row.supplier_id ?? "") ?? po.noSupplier}
                    </p>
                  </div>
                  <p className="text-sm font-black tabular-nums text-amber-300">{formatBizNpr(Number(row.total_amount))}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={row.status}
                    onChange={(e) => void updatePurchaseOrderStatus(row.id, e.target.value as PurchaseOrderStatus).then(() => toast.success(po.statusUpdated))}
                    className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                      light ? "border-emerald-200 bg-white" : "border-emerald-400/20 bg-black/30 text-white"
                    }`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{po.statusLabels[s]}</option>
                    ))}
                  </select>
                  <FireBizSecondaryButton onClick={() => void deletePurchaseOrder(row.id).then(() => toast.success(po.deleted))}>
                    <Trash2 size={14} className="inline mr-1" />{po.delete}
                  </FireBizSecondaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}
