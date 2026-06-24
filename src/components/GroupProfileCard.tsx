"use client";

import { Building2, Camera, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  emptyGroupProfile,
  groupProfileMemberCountLabel,
  groupProfileRoomLabel,
  hasGroupProfile,
  type GroupProfile,
} from "@/lib/group-profile";
import { buildSettlementHeaderDisplayText } from "@/lib/settlement-share";

type ExpenseBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function ExpenseBottomSheet({ open, onClose, title, subtitle, children }: ExpenseBottomSheetProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[71] max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-t-[1.5rem] border border-white/20 bg-white shadow-2xl sm:rounded-[1.5rem]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-emerald-950">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type GroupProfileCardProps = {
  profile: GroupProfile;
  memberCount: number;
  onSave: (profile: GroupProfile) => Promise<void>;
  saving?: boolean;
};

export function GroupProfileCard({ profile, memberCount, onSave, saving = false }: GroupProfileCardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settingsOpen) setDraft(profile);
  }, [profile, settingsOpen]);

  const branded = hasGroupProfile(profile);
  const roomLabel = groupProfileRoomLabel(profile.roomNumber);
  const memberLabel = groupProfileMemberCountLabel(memberCount);

  const openSettings = useCallback(() => {
    setDraft(profile);
    setSettingsOpen(true);
  }, [profile]);

  const handleLogoUpload = useCallback((file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
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

  return (
    <>
      <article className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/55 p-3.5 shadow-[0_8px_32px_rgba(5,150,105,0.08)] backdrop-blur-xl sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white/40 to-teal-50/50" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-900/10 sm:h-14 sm:w-14">
            {profile.logoUrl ? (
              <Image
                alt={profile.companyName ? `${profile.companyName} logo` : "Group logo"}
                className="h-full w-full object-cover"
                height={56}
                src={profile.logoUrl}
                unoptimized
                width={56}
              />
            ) : (
              <Building2 size={22} strokeWidth={2.25} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {branded ? (
              <>
                {profile.companyName ? (
                  <p className="truncate text-base font-black tracking-tight text-emerald-950 sm:text-lg">
                    {profile.companyName}
                  </p>
                ) : null}
                {roomLabel ? (
                  <p className="truncate text-sm font-bold text-emerald-700">{roomLabel}</p>
                ) : null}
                {profile.companyType ? (
                  <p className="truncate text-[11px] font-semibold text-slate-500">{profile.companyType}</p>
                ) : null}
                {profile.description ? (
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                    {profile.description}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{memberLabel}</p>
              </>
            ) : (
              <>
                <p className="text-base font-black tracking-tight text-emerald-950 sm:text-lg">Group Profile</p>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">
                  Add your company or room details for branded settlement reports.
                </p>
                <p className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{memberLabel}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={openSettings}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100/80 bg-white/70 text-emerald-700 shadow-sm transition hover:bg-white active:scale-95"
            aria-label="Edit group profile"
          >
            <Pencil size={15} strokeWidth={2.25} />
          </button>
        </div>
      </article>

      <ExpenseBottomSheet
        open={settingsOpen}
        onClose={() => !saving && setSettingsOpen(false)}
        title="Group profile"
        subtitle="Saved to your workspace · used on settlement exports"
      >
        <div className="space-y-3 overflow-y-auto px-4 pb-4 pt-2 sm:px-5">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white bg-white shadow-sm">
              {draft.logoUrl ? (
                <Image
                  alt="Group logo preview"
                  className="h-full w-full object-cover"
                  height={56}
                  src={draft.logoUrl}
                  unoptimized
                  width={56}
                />
              ) : (
                <Building2 className="text-emerald-600" size={22} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-emerald-950">Logo / photo</p>
              <p className="text-[10px] font-semibold text-slate-500">Optional · shown on exports</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100"
              >
                <Camera size={12} />
                Upload
              </button>
              {draft.logoUrl ? (
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, logoUrl: "" }))}
                  className="ml-2 text-[10px] font-bold text-red-600"
                >
                  Remove
                </button>
              ) : null}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Company / group name
            </span>
            <input
              value={draft.companyName}
              onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))}
              className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="KP Electric"
              autoComplete="organization"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Room number
            </span>
            <input
              value={draft.roomNumber}
              onChange={(event) => setDraft((current) => ({ ...current, roomNumber: event.target.value }))}
              className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="305"
              inputMode="text"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Company type <span className="font-semibold normal-case text-slate-400">(optional)</span>
            </span>
            <input
              value={draft.companyType}
              onChange={(event) => setDraft((current) => ({ ...current, companyType: event.target.value }))}
              className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Dorm · Factory housing"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Description <span className="font-semibold normal-case text-slate-400">(optional)</span>
            </span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="min-h-20 w-full resize-none rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Shared apartment for KP Electric workers"
            />
          </label>

          {hasGroupProfile(draft) ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Settlement preview</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-xs font-bold leading-relaxed text-emerald-900">
                {buildSettlementHeaderDisplayText({
                  monthKey: "",
                  monthLabel: "",
                  currency: "NPR",
                  members: [],
                  transfers: [],
                  totalGroupExpenseLabel: "",
                  receivesTotalLabel: "",
                  paysTotalLabel: "",
                  totalMembers: memberCount,
                  totalTransfers: 0,
                  companyName: draft.companyName.trim(),
                  roomNumber: draft.roomNumber.trim(),
                  companyType: draft.companyType.trim(),
                  description: draft.description.trim(),
                  logoUrl: draft.logoUrl.trim(),
                  hasGroupBranding: hasGroupProfile({
                    ...emptyGroupProfile(),
                    companyName: draft.companyName.trim(),
                    roomNumber: draft.roomNumber.trim(),
                    logoUrl: draft.logoUrl.trim(),
                  }),
                  reportHeader: "",
                  reportSubtitle: hasGroupProfile({
                    ...emptyGroupProfile(),
                    companyName: draft.companyName.trim(),
                    roomNumber: draft.roomNumber.trim(),
                    logoUrl: draft.logoUrl.trim(),
                  })
                    ? "Roommate Settlement Summary"
                    : null,
                  roomBadgeLabel: draft.roomNumber.trim()
                    ? `ROOM ${draft.roomNumber.trim().toUpperCase()}`
                    : null,
                  generatedOnLabel: "",
                  generatedAtLabel: "",
                  siteUrl: "",
                  footerUrl: "",
                })}
              </pre>
            </div>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-black text-white transition active:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </ExpenseBottomSheet>
    </>
  );
}
