"use client";

import { Download, Printer, QrCode } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizGlassCard, FireBizPrimaryButton, FireBizSecondaryButton } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { downloadInvoicePdf } from "@/lib/fire-biz/invoice-pdf";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import { parseLineItems } from "@/lib/fire-biz/line-items";
import { generateQrDataUrl, getPaymentQrOptions } from "@/lib/fire-biz/qr-payments";
import { computeVatFromSale } from "@/lib/fire-biz/vat";
import type { SaleRow } from "@/lib/fire-biz/types";

function paymentStatusCls(status: string, light: boolean) {
  if (status === "paid") return light ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-lime-300";
  if (status === "partial") return light ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-300";
  return light ? "bg-rose-100 text-rose-800" : "bg-rose-500/20 text-rose-300";
}

export function FireBizInvoiceView({ sale }: { sale: SaleRow }) {
  const copy = useFireBizCopy();
  const inv = copy.invoice;
  const { profile, customers, updateSalePayment } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const printRef = useRef<HTMLDivElement>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  const customer = useMemo(
    () => customers.find((c) => c.id === sale.customer_id) ?? null,
    [customers, sale.customer_id],
  );
  const items = useMemo(() => parseLineItems(sale.line_items), [sale.line_items]);
  const vat = useMemo(() => computeVatFromSale(sale), [sale]);
  const due = Math.max(0, Number(sale.total_amount) - Number(sale.amount_paid));
  const qrOptions = useMemo(() => getPaymentQrOptions(profile, sale), [profile, sale]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const opt of qrOptions) {
        if (opt.qrUrl) {
          next[opt.method] = opt.qrUrl;
        } else {
          next[opt.method] = await generateQrDataUrl(opt.payload);
        }
      }
      if (!cancelled) setQrImages(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [qrOptions]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf({ sale, profile, customer });
    } finally {
      setDownloading(false);
    }
  }, [sale, profile, customer]);

  const markPaid = useCallback(
    async (method: "esewa" | "khalti" | "cash" | "bank") => {
      await updateSalePayment(sale.id, {
        amount_paid: Number(sale.total_amount),
        payment_status: "paid",
        payment_method: method,
      });
    },
    [sale, updateSalePayment],
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { body * { visibility: hidden; } .fire-biz-invoice-print, .fire-biz-invoice-print * { visibility: visible; } .fire-biz-invoice-print { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; } .fire-biz-no-print { display: none !important; } }`,
        }}
      />

      <div className="space-y-6 fire-biz-no-print">
        <DashboardSectionHeader
          eyebrow={copy.moduleName}
          title={inv.title}
          subtitle={`${sale.invoice_number ?? sale.id.slice(0, 8)} · ${sale.sale_date}`}
        />
        <div className="flex flex-wrap gap-2">
          <FireBizPrimaryButton onClick={() => void handleDownload()} disabled={downloading}>
            <Download size={16} className="mr-1.5 inline" />
            {downloading ? copy.common.loading : inv.downloadPdf}
          </FireBizPrimaryButton>
          <FireBizSecondaryButton onClick={handlePrint}>
            <Printer size={16} className="mr-1.5 inline" />
            {inv.print}
          </FireBizSecondaryButton>
          <Link href="/fire-biz/sales" className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold text-emerald-400 hover:underline">
            ← {inv.backToSales}
          </Link>
        </div>
      </div>

      <div ref={printRef} className="fire-biz-invoice-print mx-auto max-w-3xl space-y-6 py-4">
        <div className={`overflow-hidden rounded-2xl border ${light ? "border-emerald-200/70 bg-white" : "border-emerald-400/20 bg-emerald-950/30"}`}>
          <div className="bg-gradient-to-r from-emerald-600 to-lime-500 px-6 py-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">FIRE Nepal</p>
            <h1 className="text-2xl font-black">{sale.is_tax_invoice ? inv.taxInvoice : inv.invoice}</h1>
            <p className="mt-1 text-sm font-semibold opacity-95">{profile?.business_name ?? "Business"}</p>
            {profile?.pan_vat ? <p className="text-xs opacity-90">VAT/PAN: {profile.pan_vat}</p> : null}
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{inv.from}</p>
              <p className="font-bold">{profile?.business_name}</p>
              {profile?.address ? <p className="text-sm opacity-80">{profile.address}</p> : null}
              {profile?.phone ? <p className="text-sm opacity-80">{profile.phone}</p> : null}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{inv.billTo}</p>
              <p className="font-bold">{customer?.name ?? inv.walkIn}</p>
              {customer?.phone ? <p className="text-sm opacity-80">{customer.phone}</p> : null}
              {customer?.address ? <p className="text-sm opacity-80">{customer.address}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 pb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatusCls(sale.payment_status, light)}`}>
              {sale.payment_status}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${light ? "bg-slate-100 text-slate-700" : "bg-white/10 text-emerald-100"}`}>
              {sale.payment_method ?? "cash"}
            </span>
            {sale.is_tax_invoice ? (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${light ? "bg-emerald-50 text-emerald-800" : "bg-emerald-500/15 text-lime-300"}`}>
                VAT {vat.vatRate}%
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto px-6 pb-4">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${light ? "border-emerald-100 text-slate-500" : "border-emerald-400/20 text-emerald-200/60"}`}>
                  <th className="py-2 pr-3">{inv.item}</th>
                  <th className="py-2 pr-3 text-right">{inv.qty}</th>
                  <th className="py-2 pr-3 text-right">{inv.rate}</th>
                  <th className="py-2 text-right">{inv.amount}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className={`border-b ${light ? "border-emerald-50" : "border-emerald-400/10"}`}>
                    <td className="py-2.5 pr-3 font-semibold">{item.name}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatBizNpr(item.unitPrice)}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold">
                      {formatBizNpr(item.quantity * item.unitPrice - (item.discount ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t px-6 py-4 sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between text-sm"><span>{inv.subtotal}</span><span className="tabular-nums font-bold">{formatBizNpr(Number(sale.subtotal) || vat.subtotal)}</span></div>
            {Number(sale.discount_amount) > 0 ? (
              <div className="flex justify-between text-sm"><span>{inv.discount}</span><span className="tabular-nums">{formatBizNpr(Number(sale.discount_amount))}</span></div>
            ) : null}
            {sale.is_tax_invoice ? (
              <div className="flex justify-between text-sm"><span>{inv.vat} ({vat.vatRate}%)</span><span className="tabular-nums">{formatBizNpr(Number(sale.tax_amount) || vat.vatAmount)}</span></div>
            ) : null}
            <div className="mt-2 flex justify-between text-lg font-black"><span>{inv.total}</span><span className="tabular-nums text-emerald-500">{formatBizNpr(Number(sale.total_amount))}</span></div>
            <div className="flex justify-between text-sm"><span>{inv.paid}</span><span className="tabular-nums">{formatBizNpr(Number(sale.amount_paid))}</span></div>
            <div className="flex justify-between text-sm font-bold"><span>{inv.due}</span><span className="tabular-nums text-rose-400">{formatBizNpr(due)}</span></div>
          </div>
        </div>

        {due > 0 && qrOptions.length > 0 ? (
          <FireBizGlassCard title={inv.scanToPay} icon={QrCode} className="fire-biz-no-print">
            <div className="grid gap-4 sm:grid-cols-2">
              {qrOptions.map((opt) => (
                <div key={opt.method} className={`rounded-2xl border p-4 text-center ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-black/20"}`}>
                  <p className="text-sm font-black">{opt.label}</p>
                  <p className="text-xs opacity-70">{formatBizNpr(opt.amount)}</p>
                  {qrImages[opt.method] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrImages[opt.method]} alt={`${opt.label} QR`} className="mx-auto mt-3 h-[180px] w-[180px] rounded-xl" />
                  ) : (
                    <div className="mx-auto mt-3 h-[180px] w-[180px] animate-pulse rounded-xl bg-emerald-500/10" />
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2 fire-biz-no-print">
                    {opt.method === "esewa" ? (
                      <FireBizSecondaryButton onClick={() => void markPaid("esewa")}>{inv.markPaidEsewa}</FireBizSecondaryButton>
                    ) : (
                      <FireBizSecondaryButton onClick={() => void markPaid("khalti")}>{inv.markPaidKhalti}</FireBizSecondaryButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FireBizGlassCard>
        ) : null}
      </div>
    </>
  );
}
