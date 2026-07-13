"use client";

import { Download, FileText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MemberCardPreviewScaler } from "@/components/membership/MemberCardPreviewScaler";
import {
  PremiumFireNepalMemberCard,
  MEMBER_CARD_EXPORT_HEIGHT,
  MEMBER_CARD_EXPORT_WIDTH,
} from "@/components/membership/PremiumFireNepalMemberCard";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { mapUserProfileRowToMemberCard, type MemberCardData } from "@/lib/member-card-profile";
import { downloadMemberCardPdfFromElement, downloadMemberCardPngFromElement } from "@/lib/member-card-export";
import { fetchUserProfile } from "@/services/user-profile-supabase";

type MemberCardDownloadPanelProps = {
  className?: string;
};

export function MemberCardDownloadPanel({ className = "" }: MemberCardDownloadPanelProps) {
  const { user } = useProductAuth();
  const exportRef = useRef<HTMLDivElement>(null);
  const [cardData, setCardData] = useState<MemberCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user) {
        setCardData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const row = await fetchUserProfile(getSupabaseBrowserClient(), user.id);
        if (cancelled) return;
        if (!row) throw new Error("Profile not found.");
        setCardData(mapUserProfileRowToMemberCard(row));
      } catch (error) {
        if (!cancelled) {
          setCardData(null);
          toast.error(error instanceof Error ? error.message : "Could not load member card data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const runExport = useCallback(
    async (kind: "png" | "pdf") => {
      if (!cardData || !exportRef.current || busy) return;
      setBusy(kind);
      try {
        if (kind === "png") {
          await downloadMemberCardPngFromElement(exportRef.current, cardData);
          toast.success("Member card PNG saved.");
        } else {
          await downloadMemberCardPdfFromElement(exportRef.current, cardData);
          toast.success("Member card PDF saved.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Could not generate member card.");
      } finally {
        setBusy(null);
      }
    },
    [busy, cardData],
  );

  if (loading) {
    return <p className="text-sm font-semibold text-zinc-400">Loading membership card…</p>;
  }

  if (!cardData) return null;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void runExport("png")}
          disabled={Boolean(busy)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} aria-hidden />
          {busy === "png" ? "Generating PNG…" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={() => void runExport("pdf")}
          disabled={Boolean(busy)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-500/10 px-5 py-3 text-sm font-black text-amber-50 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={16} aria-hidden />
          {busy === "pdf" ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      <div className="mt-6 w-full max-w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/30 p-3 sm:p-4">
        <MemberCardPreviewScaler>
          <PremiumFireNepalMemberCard data={cardData} mode="preview" />
        </MemberCardPreviewScaler>
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 opacity-[0.01]"
        style={{ zIndex: -1, width: MEMBER_CARD_EXPORT_WIDTH, height: MEMBER_CARD_EXPORT_HEIGHT }}
      >
        <PremiumFireNepalMemberCard ref={exportRef} data={cardData} mode="export" />
      </div>
    </div>
  );
}
