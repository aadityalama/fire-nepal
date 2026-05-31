"use client";

import { Copy, Download, Image as ImageIcon, Link2, Send, Share2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  downloadSummaryPdf,
  downloadSummaryPngImage,
  facebookMessengerFriendlyShareUrl,
  isDesktopShareUi,
  kakaoTalkShareHref,
  telegramShareUrl,
  whatsappShareUrl,
} from "@/lib/roommate-expense-share";

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

export type RoommateShareSummaryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryText: string;
  pageUrl: string;
  downloadBaseName: string;
};

export function RoommateShareSummaryModal({
  open,
  onOpenChange,
  summaryText,
  pageUrl,
  downloadBaseName,
}: RoommateShareSummaryModalProps) {
  const titleId = useId();
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const notifyShared = useCallback(() => {
    toast.success("Summary shared successfully");
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
      await navigator.clipboard.writeText(summaryText);
      notifyShared();
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [summaryText, notifyShared]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      notifyShared();
    } catch {
      toast.error("Could not copy link");
    }
  }, [pageUrl, notifyShared]);

  const systemShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Roommate Expense Summary",
        text: summaryText,
        url: pageUrl,
      });
      notifyShared();
      onOpenChange(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error("Sharing was cancelled or failed");
    }
  }, [summaryText, pageUrl, notifyShared, onOpenChange]);

  const savePng = useCallback(async () => {
    setBusy("png");
    try {
      await downloadSummaryPngImage(summaryText, `${downloadBaseName}.png`);
      notifyShared();
    } catch {
      toast.error("Could not export image");
    } finally {
      setBusy(null);
    }
  }, [summaryText, downloadBaseName, notifyShared]);

  const savePdf = useCallback(async () => {
    setBusy("pdf");
    try {
      await downloadSummaryPdf(summaryText, `${downloadBaseName}.pdf`);
      notifyShared();
    } catch {
      toast.error("Could not export PDF");
    } finally {
      setBusy(null);
    }
  }, [summaryText, downloadBaseName, notifyShared]);

  if (!open) return null;

  const wa = whatsappShareUrl(summaryText);
  const tg = telegramShareUrl(summaryText, pageUrl);
  const ms = facebookMessengerFriendlyShareUrl(summaryText, pageUrl);
  const kakao = kakaoTalkShareHref(summaryText);
  const showSystemShare = typeof navigator !== "undefined" && Boolean(navigator.share) && isDesktopShareUi();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/55 backdrop-blur-md" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[min(92vh,860px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/20 bg-gradient-to-b from-emerald-950 via-[#0a2e22] to-emerald-950 text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:max-h-[90vh] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/90">FIRE Nepal</p>
            <h2 id={titleId} className="mt-1 font-nepali text-xl font-black tracking-tight sm:text-2xl">
              Share expense summary
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-100/75 sm:text-sm">
              Send to roommates on WhatsApp, Messenger, KakaoTalk, or Telegram — or export as image / PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 text-emerald-100 transition hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="rounded-2xl border border-emerald-500/25 bg-black/25 p-4 shadow-inner ring-1 ring-white/5">
            <pre className="max-h-[11rem] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-emerald-50/95 sm:max-h-[13rem] sm:text-xs">
              {summaryText}
            </pre>
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Share via</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => openExternal(wa)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#128C7E]/20 px-3 py-3.5 text-[11px] font-black text-emerald-50 transition hover:bg-[#128C7E]/35 hover:shadow-lg"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#25D366] text-white shadow-md shadow-black/20">
                <IconWhatsApp className="h-5 w-5" />
              </span>
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => openExternal(ms)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#0084ff]/15 px-3 py-3.5 text-[11px] font-black text-emerald-50 transition hover:bg-[#0084ff]/28 hover:shadow-lg"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0084FF] text-white shadow-md shadow-black/20">
                <IconMessenger className="h-5 w-5" />
              </span>
              Messenger
            </button>
            <a
              href={kakao}
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#FEE500]/10 px-3 py-3.5 text-center text-[11px] font-black text-emerald-50 transition hover:bg-[#FEE500]/20 hover:shadow-lg"
              onClick={notifyShared}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FEE500] text-[#191919] shadow-md shadow-black/20">
                <IconKakao className="h-6 w-6" />
              </span>
              KakaoTalk
            </a>
            <button
              type="button"
              onClick={() => openExternal(tg)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-sky-500/15 px-3 py-3.5 text-[11px] font-black text-emerald-50 transition hover:bg-sky-500/28 hover:shadow-lg"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500 text-white shadow-md shadow-black/20">
                <IconTelegram className="h-5 w-5" />
              </span>
              Telegram
            </button>
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Copy & export</p>
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={copyText}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black text-white transition hover:bg-white/10 sm:min-w-[140px]"
            >
              <Copy className="h-4 w-4 shrink-0 text-emerald-200" />
              Copy text
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black text-white transition hover:bg-white/10 sm:min-w-[140px]"
            >
              <Link2 className="h-4 w-4 shrink-0 text-emerald-200" />
              Copy link
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={savePng}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-xs font-black text-emerald-50 transition hover:bg-emerald-500/25 disabled:opacity-50 sm:min-w-[140px]"
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              {busy === "png" ? "Saving…" : "Image"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={savePdf}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-600/25 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-600/35 disabled:opacity-50 sm:min-w-[140px]"
            >
              <Download className="h-4 w-4 shrink-0" />
              {busy === "pdf" ? "Saving…" : "PDF"}
            </button>
          </div>

          {showSystemShare ? (
            <button
              type="button"
              onClick={systemShare}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-gradient-to-r from-emerald-600/40 to-teal-600/30 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-950/30 transition hover:from-emerald-500/50 hover:to-teal-500/40"
            >
              <Share2 className="h-4 w-4" />
              Use system share
              <Send className="h-4 w-4 opacity-80" />
            </button>
          ) : null}

          <p className="mt-4 text-center text-[10px] font-semibold leading-relaxed text-emerald-200/55">
            KakaoTalk opens the app when installed (Android intent + iOS URL scheme). Copy text if the app does not
            open.
          </p>
        </div>
      </div>
    </div>
  );
}
