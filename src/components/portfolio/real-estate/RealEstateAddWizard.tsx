"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import {
  REAL_ESTATE_DOC_CATEGORIES,
  compressRealEstateImage,
  makeRealEstateDocument,
  uploadRealEstateFile,
} from "@/components/portfolio/real-estate-documents";
import { newId } from "@/components/portfolio/storage";
import type {
  RealEstateDocument,
  RealEstateDocumentCategory,
  RealEstateKind,
  RealEstateRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import {
  ReBackHeader,
  ReFieldLabel,
  ReGlass,
  ReInputClassName,
  RE_KIND_LABEL,
} from "@/components/portfolio/real-estate/RealEstateUi";
import type { PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { cn } from "@/lib/utils";

const STEPS = [
  "Type",
  "Name",
  "Location",
  "Purchase",
  "Current Value",
  "Acquired Date",
  "Photos",
  "Documents",
  "Finish",
] as const;

type Draft = {
  id: string;
  propertyType: RealEstateKind;
  name: string;
  location: string;
  mapsUrl: string;
  purchaseValue: number | undefined;
  estimatedValue: number | undefined;
  currency: PortfolioDisplayCurrency;
  acquiredDate: string | undefined;
  photos: string[];
  documents: RealEstateDocument[];
};

const DRAFT_KEY = (id: string) => `fire-nepal-re-draft:${id}`;

function emptyDraft(): Draft {
  return {
    id: newId(),
    propertyType: "apartment",
    name: "",
    location: "",
    mapsUrl: "",
    purchaseValue: undefined,
    estimatedValue: undefined,
    currency: "NPR",
    acquiredDate: undefined,
    photos: [],
    documents: [],
  };
}

function loadDraft(id: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY(id));
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY(d.id), JSON.stringify(d));
  } catch {
    /* quota */
  }
}

function clearDraft(id: string) {
  try {
    sessionStorage.removeItem(DRAFT_KEY(id));
  } catch {
    /* ignore */
  }
}

export function RealEstateAddWizard({
  onCancel,
  onComplete,
  onMutate,
}: {
  onCancel: () => void;
  onComplete: (propertyId: string) => void;
  onMutate: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return emptyDraft();
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (!k?.startsWith("fire-nepal-re-draft:")) continue;
        const existing = loadDraft(k.replace("fire-nepal-re-draft:", ""));
        if (existing && (existing.name || existing.photos.length || existing.purchaseValue)) {
          return existing;
        }
      }
    } catch {
      /* ignore */
    }
    return emptyDraft();
  });
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [docCat, setDocCat] = useState<RealEstateDocumentCategory>("lalpurja");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const canNext = useMemo(() => {
    if (step === 1) return draft.name.trim().length > 0;
    if (step === 3) return draft.purchaseValue != null && draft.purchaseValue > 0;
    if (step === 4) return draft.estimatedValue != null && draft.estimatedValue > 0;
    return true;
  }, [step, draft]);

  const finish = () => {
    const row: RealEstateRow = {
      id: draft.id,
      propertyType: draft.propertyType,
      name: draft.name.trim() || "Untitled property",
      location: draft.location.trim() || undefined,
      mapsUrl: draft.mapsUrl.trim() || undefined,
      purchaseValue: draft.purchaseValue,
      estimatedValue: draft.estimatedValue,
      currency: draft.currency,
      acquiredDate: draft.acquiredDate,
      propertyPhoto: draft.photos[0],
      propertyPhotos: draft.photos.length > 1 ? draft.photos.slice(1) : undefined,
      documents: draft.documents.length ? draft.documents : undefined,
    };
    const ok = onMutate((s) => {
      if (s.realEstate.some((r) => r.id === row.id)) {
        return {
          ...s,
          realEstate: s.realEstate.map((r) => (r.id === row.id ? { ...r, ...row } : r)),
        };
      }
      return { ...s, realEstate: [...s.realEstate, row] };
    });
    if (!ok) {
      toast.error("Could not save property");
      return;
    }
    clearDraft(draft.id);
    toast.success("Property added");
    onComplete(row.id);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next = [...draft.photos];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const uploaded = await uploadRealEstateFile({
          file,
          propertyId: draft.id,
          category: "property_photo",
        });
        const url = uploaded?.url ?? (await compressRealEstateImage(file));
        if (url) next.push(url);
      }
      patch({ photos: next });
    } finally {
      setBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const addDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next = [...draft.documents];
      for (const file of Array.from(files)) {
        const uploaded = await uploadRealEstateFile({ file, propertyId: draft.id, category: docCat });
        if (!uploaded) continue;
        next.push(
          makeRealEstateDocument({
            name: uploaded.name,
            category: docCat,
            mimeType: uploaded.mimeType,
            url: uploaded.url,
            storagePath: uploaded.storagePath,
          }),
        );
      }
      patch({ documents: next });
    } finally {
      setBusy(false);
      if (docRef.current) docRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <ReBackHeader title="Add Property" subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} onBack={onCancel} />

      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={STEPS[i]}
            className={cn(
              "h-1.5 flex-1 rounded-full transition",
              i <= step ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-emerald-500/15",
            )}
          />
        ))}
      </div>

      <ReGlass className="p-5">
        {step === 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(RE_KIND_LABEL) as RealEstateKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => patch({ propertyType: k })}
                className={cn(
                  "min-h-[4.5rem] rounded-2xl border px-3 py-3 text-sm font-black transition",
                  draft.propertyType === k
                    ? "border-emerald-400/50 bg-emerald-500/20 text-lime-200"
                    : "border-emerald-400/15 bg-black/30 text-emerald-200/70",
                )}
              >
                {RE_KIND_LABEL[k]}
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <ReFieldLabel>Property name</ReFieldLabel>
            <input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Budhanilkantha Villa"
              className={ReInputClassName}
              autoFocus
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <ReFieldLabel>Location</ReFieldLabel>
              <input
                value={draft.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Ward, city, country"
                className={ReInputClassName}
              />
            </div>
            <div>
              <ReFieldLabel>Google Maps URL (optional)</ReFieldLabel>
              <input
                value={draft.mapsUrl}
                onChange={(e) => patch({ mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/…"
                className={ReInputClassName}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <ReFieldLabel>Currency</ReFieldLabel>
              <CurrencySelect value={draft.currency} onChange={(c) => patch({ currency: c })} />
            </div>
            <div>
              <ReFieldLabel>Purchase value</ReFieldLabel>
              <NumericMoneyInput
                value={draft.purchaseValue}
                onChange={(n) => patch({ purchaseValue: n })}
                className={ReInputClassName}
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <ReFieldLabel>Current market value</ReFieldLabel>
            <NumericMoneyInput
              value={draft.estimatedValue}
              onChange={(n) => patch({ estimatedValue: n })}
              className={ReInputClassName}
            />
          </div>
        ) : null}

        {step === 5 ? (
          <PortfolioIsoDateField
            label="Acquired date"
            value={draft.acquiredDate}
            onChange={(v) => patch({ acquiredDate: v })}
            className="w-full sm:max-w-none"
          />
        ) : null}

        {step === 6 ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => photoRef.current?.click()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-sm font-black text-emerald-100"
            >
              {busy ? "Uploading…" : "Add photos"}
            </button>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files)} />
            {draft.photos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {draft.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${i}-${p.slice(0, 24)}`} src={p} alt="" className="aspect-square rounded-xl object-cover ring-1 ring-emerald-400/20" />
                ))}
              </div>
            ) : (
              <p className="text-center text-xs font-semibold text-emerald-200/50">Optional — you can add photos later.</p>
            )}
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-3">
            <select
              value={docCat}
              onChange={(e) => setDocCat(e.target.value as RealEstateDocumentCategory)}
              className={ReInputClassName}
            >
              {REAL_ESTATE_DOC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => docRef.current?.click()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-sm font-black text-emerald-100"
            >
              {busy ? "Uploading…" : "Upload documents"}
            </button>
            <input
              ref={docRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => void addDocs(e.target.files)}
            />
            <p className="text-center text-xs font-semibold text-emerald-200/50">
              {draft.documents.length} document{draft.documents.length === 1 ? "" : "s"} attached
            </p>
          </div>
        ) : null}

        {step === 8 ? (
          <div className="space-y-3 text-sm">
            <p className="text-lg font-black text-emerald-50">{draft.name || "Untitled property"}</p>
            <p className="font-semibold text-emerald-200/65">
              {RE_KIND_LABEL[draft.propertyType]}
              {draft.location ? ` · ${draft.location}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold tabular-nums text-emerald-100">
              <p>Purchase: {draft.purchaseValue?.toLocaleString() ?? "—"} {draft.currency}</p>
              <p>Current: {draft.estimatedValue?.toLocaleString() ?? "—"} {draft.currency}</p>
              <p>Photos: {draft.photos.length}</p>
              <p>Docs: {draft.documents.length}</p>
            </div>
            <button
              type="button"
              onClick={finish}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-emerald-950"
            >
              <Check size={18} /> Save property
            </button>
          </div>
        ) : null}
      </ReGlass>

      {step < 8 ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl border border-emerald-400/20 text-sm font-black text-emerald-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-emerald-950 disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
