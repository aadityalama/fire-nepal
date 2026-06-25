"use client";

import { Copy, Download, Image as ImageIcon, Link2, Send, Share2, X, Calendar, Clock } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  facebookMessengerFriendlyShareUrl,
  isDesktopShareUi,
  kakaoTalkShareHref,
  telegramShareUrl,
  whatsappShareUrl,
} from "@/lib/roommate-expense-share";
import {
  buildSettlementShareCardText,
  buildSettlementShareSocialMessage,
  downloadSettlementSharePdf,
  downloadSettlementSharePng,
  lineShareUrl,
  memberRoleColor,
  memberRoleIcon,
  settlementSharePngBlob,
  type SettlementShareData,
} from "@/lib/settlement-share";
import { FireNepalBrandLogo } from "@/components/FireNepalBrandLogo";
import { SettlementBrandingHeader } from "@/components/SettlementBrandingHeader";
import { SettlementReportFooter } from "@/components/SettlementReportFooter";

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function IconMessenger({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 0C5.373 0 0 4.975 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.191 14.963-3.056-3.259-5.963 3.259L10.73 8l3.056 3.259 5.963-3.259-6.558 6.963z"
      />
    </svg>
  );
}

function IconKakao({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3c-5.2 0-9.43 3.329-9.43 7.42 0 2.6 1.71 4.89 4.33 6.23l-.87 3.12a.3.3 0 00.46.32l3.65-2.43c.58.08 1.18.13 1.81.13 5.2 0 9.43-3.33 9.43-7.42S17.2 3 12 3z"
      />
    </svg>
  );
}

function IconTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
      />
    </svg>
  );
}

function SettlementShareCardPreview({ data }: { data: SettlementShareData }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SettlementBrandingHeader
            companyName={data.companyName}
            roomNumber={data.roomNumber}
            logoUrl={data.logoUrl}
            hasGroupBranding={data.hasGroupBranding}
            reportSubtitle={data.reportSubtitle}
            variant="export"
          />
        </div>
        <FireNepalBrandLogo className="h-7 w-auto max-w-[88px] sm:h-9 sm:max-w-[104px]" />
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Settlement Period</p>
        <p className="mt-1 text-lg font-black text-[#111827] sm:text-xl">{data.monthLabel}</p>
        <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{data.currency}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3.5">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Generated On</p>
        <div className="mt-2.5 flex items-start gap-2.5">
          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
          <p className="min-w-0 text-xs font-semibold leading-snug text-[#111827]">{data.generatedOnLabel}</p>
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
          <p className="min-w-0 text-xs font-medium leading-snug text-[#6B7280]">{data.generatedAtLabel}</p>
        </div>
      </div>

      <div className="my-6 border-t border-[#E5E7EB]" />

      <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
        Member Settlement Breakdown
      </p>
      <ul className="mt-4 space-y-3.5">
        {data.members.map((m) => {
          const roleColor = memberRoleColor(m.role);
          const icon = memberRoleIcon(m.role);
          const avatarRing =
            m.role === "receives"
              ? "ring-[#10B981]"
              : m.role === "pays"
                ? "ring-[#DC2626]"
                : "ring-[#E5E7EB]";
          const avatarBg =
            m.role === "receives"
              ? "bg-emerald-50 text-[#10B981]"
              : m.role === "pays"
                ? "bg-red-50 text-[#DC2626]"
                : "bg-gray-50 text-[#6B7280]";

          return (
            <li
              key={m.memberId}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className={`h-11 w-11 shrink-0 rounded-full object-cover ring-2 ${avatarRing}`}
                  />
                ) : (
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[11px] font-black ring-2 ${avatarBg} ${avatarRing}`}
                  >
                    {m.initials}
                  </div>
                )}
                <p className="min-w-0 truncate text-sm font-black text-[#111827]">
                  {icon ? (
                    <span style={{ color: roleColor }}>{icon} </span>
                  ) : null}
                  {m.name}
                </p>
              </div>
              <div className="mt-3 space-y-1.5 pl-[3.25rem]">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#6B7280]">Paid:</span>
                  <span className="font-medium tabular-nums text-[#6B7280]">{m.paidLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#6B7280]">Share:</span>
                  <span className="font-medium tabular-nums text-[#6B7280]">{m.shareLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#6B7280]">Balance:</span>
                  <span className="font-bold tabular-nums" style={{ color: roleColor }}>
                    {m.balanceLabel}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="my-6 border-t border-[#E5E7EB]" />

      <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Final Transfers</p>
      {data.transfers.length === 0 ? (
        <p className="mt-2.5 text-sm font-bold text-[#10B981]">All settled — no transfers needed</p>
      ) : (
        <ul className="mt-3.5 space-y-2.5">
          {data.transfers.map((t, i) => (
            <li
              key={`${t.fromName}-${t.toName}-${i}`}
              className="rounded-2xl border border-[#E5E7EB] bg-white px-3.5 py-3"
            >
              <p className="text-xs font-semibold">
                <span className="text-[#DC2626]">{t.fromName}</span>
                <span className="text-[#6B7280]"> → </span>
                <span className="text-[#10B981]">{t.toName}</span>
              </p>
              <p className="text-right text-sm font-black tabular-nums text-[#111827]">{t.amountLabel}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="my-6 border-t border-[#E5E7EB]" />

      <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Report Summary</p>
      <div className="mt-3.5 space-y-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#6B7280]">Total Group Expense:</span>
          <span className="font-black tabular-nums text-[#111827]">{data.totalGroupExpenseLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#6B7280]">Total Members:</span>
          <span className="font-black tabular-nums text-[#111827]">{data.totalMembers}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#6B7280]">Total Transfers:</span>
          <span className="font-black tabular-nums text-[#111827]">{data.totalTransfers}</span>
        </div>
      </div>

      <SettlementReportFooter className="mt-6" />
    </div>
  );
}

export type SettlementShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SettlementShareData;
  downloadBaseName: string;
};

export function SettlementShareModal({
  open,
  onOpenChange,
  data,
  downloadBaseName,
}: SettlementShareModalProps) {
  const titleId = useId();
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);

  const cardText = buildSettlementShareCardText(data);
  const socialText = buildSettlementShareSocialMessage(data);
  const pageUrl = data.siteUrl;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const notifyShared = useCallback(() => {
    toast.success("Settlement shared successfully");
  }, []);

  const openExternal = useCallback(
    (href: string) => {
      window.open(href, "_blank", "noopener,noreferrer");
      notifyShared();
    },
    [notifyShared],
  );

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(socialText);
      notifyShared();
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [socialText, notifyShared]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      notifyShared();
    } catch {
      toast.error("Could not copy link");
    }
  }, [pageUrl, notifyShared]);

  const shareResult = useCallback(async () => {
    setBusy("share");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        const blob = await settlementSharePngBlob(data);
        const file = new File([blob], `${downloadBaseName}.png`, { type: "image/png" });
        const shareData: ShareData = { title: "Roommate Settlement Summary", text: socialText, url: pageUrl };
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
        } else {
          await navigator.share(shareData);
        }
        notifyShared();
        onOpenChange(false);
        return;
      }
      await copyText();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error("Sharing was cancelled or failed");
    } finally {
      setBusy(null);
    }
  }, [data, socialText, pageUrl, downloadBaseName, notifyShared, onOpenChange, copyText]);

  const savePng = useCallback(async () => {
    setBusy("png");
    try {
      await downloadSettlementSharePng(data, `${downloadBaseName}.png`);
      notifyShared();
    } catch {
      toast.error("Could not export image");
    } finally {
      setBusy(null);
    }
  }, [data, downloadBaseName, notifyShared]);

  const savePdf = useCallback(async () => {
    setBusy("pdf");
    try {
      await downloadSettlementSharePdf(data, `${downloadBaseName}.pdf`);
      notifyShared();
    } catch {
      toast.error("Could not export PDF");
    } finally {
      setBusy(null);
    }
  }, [data, downloadBaseName, notifyShared]);

  if (!open) return null;

  const wa = whatsappShareUrl(socialText);
  const tg = telegramShareUrl(socialText, pageUrl);
  const ms = facebookMessengerFriendlyShareUrl(socialText, pageUrl);
  const kakao = kakaoTalkShareHref(socialText);
  const line = lineShareUrl(socialText);
  const showDesktopShare = typeof navigator !== "undefined" && Boolean(navigator.share) && isDesktopShareUi();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[#E5E7EB] bg-white text-[#111827] shadow-2xl sm:max-h-[90vh] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E5E7EB] px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#10B981]">FIRE Nepal</p>
            <h2 id={titleId} className="mt-1 font-nepali text-xl font-black tracking-tight text-[#111827] sm:text-2xl">
              Share settlement
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B7280] sm:text-sm">
              {data.monthLabel} · {data.currency}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-gray-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-5 py-4 sm:px-6">
          <SettlementShareCardPreview data={data} />

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={shareResult}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:col-span-3"
            >
              <Share2 className="h-4 w-4" />
              {busy === "share" ? "Sharing…" : "Share Result"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={savePng}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-black text-[#111827] transition hover:bg-gray-50 disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4" />
              {busy === "png" ? "Saving…" : "Download PNG"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={savePdf}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-black text-[#111827] transition hover:bg-gray-50 disabled:opacity-50 sm:col-span-2"
            >
              <Download className="h-4 w-4" />
              {busy === "pdf" ? "Saving…" : "Download PDF"}
            </button>
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#6B7280]">Share via</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => openExternal(wa)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-2 py-3 text-[10px] font-black text-[#111827]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#25D366] text-white">
                <IconWhatsApp className="h-4 w-4" />
              </span>
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => openExternal(ms)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-2 py-3 text-[10px] font-black text-[#111827]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0084FF] text-white">
                <IconMessenger className="h-4 w-4" />
              </span>
              Messenger
            </button>
            <a
              href={kakao}
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-2 py-3 text-center text-[10px] font-black text-[#111827]"
              onClick={notifyShared}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FEE500] text-[#191919]">
                <IconKakao className="h-5 w-5" />
              </span>
              KakaoTalk
            </a>
            <button
              type="button"
              onClick={() => openExternal(tg)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-2 py-3 text-[10px] font-black text-[#111827]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500 text-white">
                <IconTelegram className="h-4 w-4" />
              </span>
              Telegram
            </button>
            <button
              type="button"
              onClick={() => openExternal(line)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-2 py-3 text-[10px] font-black text-[#111827]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00B900] text-white">
                <IconLine className="h-4 w-4" />
              </span>
              LINE
            </button>
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#6B7280]">Copy & export</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={copyText}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-black text-[#111827]"
            >
              <Copy className="h-4 w-4 text-[#6B7280]" />
              Copy text
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-black text-[#111827]"
            >
              <Link2 className="h-4 w-4 text-[#6B7280]" />
              Copy link
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={savePng}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-black text-[#111827]"
            >
              <ImageIcon className="h-4 w-4" />
              Instagram / Story
            </button>
          </div>

          {showDesktopShare ? (
            <button
              type="button"
              onClick={shareResult}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-black text-[#111827]"
            >
              <Send className="h-4 w-4" />
              System share
            </button>
          ) : null}

          <pre className="mt-4 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E5E7EB] bg-white p-3 font-mono text-[10px] leading-relaxed text-[#374151]">
            {cardText}
          </pre>
        </div>
      </div>
    </div>
  );
}
