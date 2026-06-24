"use client";

import { motion } from "framer-motion";
import { Building2, Camera, Loader2, Pencil, UsersRound, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  GroupProfileCardSkeleton,
  SettlementBrandingHeader,
} from "@/components/SettlementBrandingHeader";
import {
  compressLogoFile,
  groupLogoInitials,
  logoFileRejectReason,
} from "@/lib/group-profile-logo";
import {
  groupProfileMemberCountLabel,
  groupProfileRoomLabel,
  hasGroupProfile,
  type GroupProfile,
} from "@/lib/group-profile";

const motionEase = [0.22, 1, 0.36, 1] as const;

type ExpenseBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function ExpenseBottomSheet({ open, onClose, title, subtitle, children }: ExpenseBottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/45 backdrop-blur-sm dark:bg-black/55" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[71] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-white/20 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-emerald-950 sm:rounded-[1.5rem]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-emerald-900/50 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-emerald-950 dark:text-emerald-50">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-emerald-200/70">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            aria-label="Close group profile settings"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
      </div>
    </div>
  );
}

type GroupLogoProps = {
  logoUrl?: string;
  companyName: string;
  size?: "sm" | "md" | "lg";
};

function GroupLogo({ logoUrl = "", companyName, size = "md" }: GroupLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(logoUrl) && failedUrl !== logoUrl;
  const sizeClass =
    size === "lg" ? "h-16 w-16 rounded-2xl text-sm" : size === "sm" ? "h-10 w-10 rounded-xl text-[10px]" : "h-14 w-14 rounded-2xl text-xs";
  const iconSize = size === "lg" ? 24 : size === "sm" ? 16 : 20;
  const initials = groupLogoInitials(companyName);

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center overflow-hidden border border-emerald-100/90 bg-gradient-to-br from-emerald-600 to-teal-500 font-black text-white shadow-md shadow-emerald-900/10 ring-1 ring-white/70 dark:border-emerald-700/50 dark:from-emerald-700 dark:to-teal-600`}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(logoUrl)}
          decoding="async"
        />
      ) : initials.length >= 2 && companyName.trim() ? (
        <span className="tracking-wide">{initials}</span>
      ) : (
        <Building2 size={iconSize} strokeWidth={2.25} />
      )}
    </div>
  );
}

export type GroupProfileCardProps = {
  profile: GroupProfile;
  memberCount: number;
  onSave: (profile: GroupProfile) => Promise<void>;
  saving?: boolean;
  loading?: boolean;
};

function GroupProfileCardInner({
  profile,
  memberCount,
  onSave,
  saving = false,
  loading = false,
}: GroupProfileCardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const branded = hasGroupProfile(profile);
  const roomLabel = groupProfileRoomLabel(profile.roomNumber);
  const memberLabel = groupProfileMemberCountLabel(memberCount);
  const draftBranded = hasGroupProfile({
    companyName: draft.companyName.trim(),
    roomNumber: draft.roomNumber.trim(),
    companyType: draft.companyType.trim(),
    description: draft.description.trim(),
    logoUrl: draft.logoUrl.trim(),
  });

  const openSettings = useCallback(() => {
    setDraft(profile);
    setSettingsOpen(true);
  }, [profile]);

  const handleLogoUpload = useCallback(async (file?: File) => {
    if (!file) return;
    const reject = logoFileRejectReason(file);
    if (reject) {
      toast.error(reject);
      return;
    }
    setLogoUploading(true);
    try {
      const dataUrl = await compressLogoFile(file);
      setDraft((current) => ({ ...current, logoUrl: dataUrl }));
    } catch {
      toast.error("Could not process image");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    await onSave({
      companyName: draft.companyName.trim(),
      roomNumber: draft.roomNumber.trim(),
      companyType: draft.companyType.trim(),
      description: draft.description.trim(),
      logoUrl: draft.logoUrl.trim(),
    });
    setSettingsOpen(false);
  }, [draft, onSave]);

  if (loading) {
    return <GroupProfileCardSkeleton />;
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: motionEase }}
        className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/60 p-3.5 shadow-[0_10px_40px_rgba(5,150,105,0.09)] backdrop-blur-xl dark:border-emerald-900/35 dark:bg-emerald-950/40 dark:shadow-emerald-950/30 sm:p-4"
        aria-label={branded ? `${profile.companyName || "Group"} profile` : "Group profile"}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-white/50 to-teal-50/40 dark:from-emerald-900/30 dark:via-emerald-950/20 dark:to-teal-950/20"
          aria-hidden
        />
        <div className="relative flex min-w-0 items-start gap-3">
          <GroupLogo logoUrl={profile.logoUrl} companyName={profile.companyName} size="md" />
          <div className="min-w-0 flex-1 pr-1">
            {branded ? (
              <>
                {profile.companyName ? (
                  <h2 className="truncate text-[17px] font-black leading-tight tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-lg">
                    {profile.companyName}
                  </h2>
                ) : null}
                {roomLabel ? (
                  <p className="truncate text-sm font-semibold text-emerald-700 dark:text-emerald-300">{roomLabel}</p>
                ) : null}
                {profile.companyType ? (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-emerald-200/60">
                    {profile.companyType}
                  </p>
                ) : null}
                {profile.description ? (
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-emerald-100/55">
                    {profile.description}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h2 className="text-[17px] font-black tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-lg">
                  Group Profile
                </h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-emerald-200/65">
                  Add company or room details for branded settlement reports.
                </p>
              </>
            )}
            <span
              className="mt-2.5 inline-flex min-h-6 items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-900/50 dark:text-emerald-100 dark:ring-emerald-700/50"
              aria-label={memberLabel}
            >
              <UsersRound size={11} aria-hidden />
              <span aria-hidden>{memberLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={openSettings}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-100/90 bg-white/80 text-emerald-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
            aria-label="Edit group profile"
          >
            <Pencil size={15} strokeWidth={2.25} />
          </button>
        </div>
      </motion.article>

      <ExpenseBottomSheet
        open={settingsOpen}
        onClose={() => !saving && setSettingsOpen(false)}
        title="Group profile"
        subtitle="Saved to your workspace · used on settlement exports"
      >
        <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-5">
          <div className="rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 to-white p-3.5 dark:border-emerald-800/50 dark:from-emerald-950/50 dark:to-emerald-900/20">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-emerald-300/70">
              Logo preview
            </p>
            <div className="mt-2.5 flex min-w-0 items-center gap-3">
              <div className="relative">
                <GroupLogo logoUrl={draft.logoUrl} companyName={draft.companyName} size="lg" />
                {logoUploading ? (
                  <span className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 dark:bg-emerald-950/70">
                    <Loader2 className="animate-spin text-emerald-600" size={20} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-50">Group logo / photo</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-emerald-200/60">
                  PNG or JPG · max 2 MB · shown on exports
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={logoUploading || saving}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700"
                  >
                    <Camera size={13} />
                    {draft.logoUrl ? "Replace" : "Upload"}
                  </button>
                  {draft.logoUrl ? (
                    <button
                      type="button"
                      disabled={logoUploading || saving}
                      onClick={() => setDraft((current) => ({ ...current, logoUrl: "" }))}
                      className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="sr-only"
                  aria-label="Upload group logo"
                  onChange={(event) => void handleLogoUpload(event.target.files?.[0])}
                />
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-emerald-300/70">
              Company / group name
            </span>
            <input
              value={draft.companyName}
              onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))}
              className="w-full min-w-0 rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:focus:ring-emerald-800"
              placeholder="KP Electric"
              autoComplete="organization"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-emerald-300/70">
              Room number
            </span>
            <input
              value={draft.roomNumber}
              onChange={(event) => setDraft((current) => ({ ...current, roomNumber: event.target.value }))}
              className="w-full min-w-0 rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:focus:ring-emerald-800"
              placeholder="305"
              inputMode="text"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-emerald-300/70">
              Company type <span className="font-semibold normal-case text-slate-400">(optional)</span>
            </span>
            <input
              value={draft.companyType}
              onChange={(event) => setDraft((current) => ({ ...current, companyType: event.target.value }))}
              className="w-full min-w-0 rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:focus:ring-emerald-800"
              placeholder="Dorm · Factory housing"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-emerald-300/70">
              Description <span className="font-semibold normal-case text-slate-400">(optional)</span>
            </span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="min-h-20 w-full min-w-0 resize-none rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:focus:ring-emerald-800"
              placeholder="Shared apartment for KP Electric workers"
            />
          </label>

          {draftBranded ? (
            <div className="rounded-2xl border border-dashed border-emerald-200/90 bg-emerald-50/50 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-emerald-300/60">
                Settlement header preview
              </p>
              <div className="mt-2 rounded-xl bg-white/90 p-3 shadow-sm dark:bg-emerald-950/50">
                <SettlementBrandingHeader
                  companyName={draft.companyName.trim()}
                  roomNumber={draft.roomNumber.trim()}
                  logoUrl={draft.logoUrl.trim()}
                  hasGroupBranding={draftBranded}
                  reportSubtitle="Roommate Settlement Summary"
                  variant="compact"
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={saving || logoUploading}
            onClick={() => void handleSave()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:bg-emerald-900 disabled:opacity-60 dark:focus-visible:ring-offset-emerald-950"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </button>
        </div>
      </ExpenseBottomSheet>
    </>
  );
}

export const GroupProfileCard = memo(GroupProfileCardInner);
export { GroupProfileCardSkeleton };
