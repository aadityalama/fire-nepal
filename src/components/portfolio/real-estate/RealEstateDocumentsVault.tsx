"use client";

import {
  Download,
  Eye,
  FileText,
  Grid2X2,
  List,
  Pencil,
  Replace,
  Share2,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  REAL_ESTATE_DOC_CATEGORIES,
  REAL_ESTATE_DOCS_MAX,
  makeRealEstateDocument,
  uploadRealEstateFile,
} from "@/components/portfolio/real-estate-documents";
import type { RealEstateDocument, RealEstateDocumentCategory, RealEstateRow } from "@/components/portfolio/types";
import { ReBadge, ReFieldLabel, ReGlass, ReSectionTitle } from "@/components/portfolio/real-estate/RealEstateUi";
import { cn } from "@/lib/utils";

function isImageDoc(doc: RealEstateDocument): boolean {
  return doc.mimeType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(doc.name);
}

function isPdfDoc(doc: RealEstateDocument): boolean {
  return doc.mimeType === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf") || doc.url.startsWith("data:application/pdf");
}

export function RealEstateDocumentsVault({
  row,
  onChange,
}: {
  row: RealEstateRow;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
}) {
  const docs = useMemo(() => row.documents ?? [], [row.documents]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<RealEstateDocumentCategory>("lalpurja");
  const [filter, setFilter] = useState<RealEstateDocumentCategory | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<RealEstateDocument | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? docs : docs.filter((d) => d.category === filter)),
    [docs, filter],
  );

  const byCategory = useMemo(() => {
    const map = new Map<RealEstateDocumentCategory, number>();
    for (const d of docs) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    return map;
  }, [docs]);

  const persist = (next: RealEstateDocument[]) => {
    onChange(row.id, { documents: next.length ? next : undefined });
  };

  const uploadFiles = async (files: FileList | null, replaceId?: string | null) => {
    if (!files?.length) return;
    if (!replaceId && docs.length >= REAL_ESTATE_DOCS_MAX) {
      toast.error(`Vault capped at ${REAL_ESTATE_DOCS_MAX} documents.`);
      return;
    }
    setBusy(true);
    try {
      let next = [...docs];
      for (const file of Array.from(files)) {
        const uploaded = await uploadRealEstateFile({ file, propertyId: row.id, category });
        if (!uploaded) {
          toast.error(`Could not upload ${file.name}`);
          continue;
        }
        const doc = makeRealEstateDocument({
          name: uploaded.name,
          category,
          mimeType: uploaded.mimeType,
          url: uploaded.url,
          storagePath: uploaded.storagePath,
        });
        if (replaceId) {
          next = next.map((d) =>
            d.id === replaceId
              ? { ...doc, id: d.id, name: d.name, category: d.category, updatedAt: new Date().toISOString() }
              : d,
          );
          replaceId = null;
        } else {
          if (next.length >= REAL_ESTATE_DOCS_MAX) break;
          next.push(doc);
        }
      }
      persist(next);
      toast.success("Vault updated");
    } finally {
      setBusy(false);
      setReplaceTargetId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shareDoc = async (doc: RealEstateDocument) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: doc.name, url: doc.url.startsWith("http") ? doc.url : undefined, text: doc.name });
      } else {
        await navigator.clipboard.writeText(doc.url.startsWith("http") ? doc.url : doc.name);
        toast.success("Copied document link / name");
      }
    } catch {
      /* user cancelled */
    }
  };

  const downloadDoc = (doc: RealEstateDocument) => {
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.name;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };

  return (
    <div className="space-y-4">
      <ReSectionTitle
        title="Documents"
        subtitle={`${docs.length} / ${REAL_ESTATE_DOCS_MAX} files`}
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl border",
                view === "grid" ? "border-emerald-400/40 bg-emerald-500/20 text-lime-200" : "border-emerald-400/15 text-emerald-200/50",
              )}
              aria-label="Grid view"
            >
              <Grid2X2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl border",
                view === "list" ? "border-emerald-400/40 bg-emerald-500/20 text-lime-200" : "border-emerald-400/15 text-emerald-200/50",
              )}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        }
      />

      <ReGlass className="p-3.5">
        <ReFieldLabel>Upload category</ReFieldLabel>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RealEstateDocumentCategory)}
          className="mb-3 w-full rounded-2xl border border-emerald-400/20 bg-black/40 px-3 py-2.5 text-sm font-semibold text-emerald-50"
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
          onClick={() => {
            setReplaceTargetId(null);
            inputRef.current?.click();
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-emerald-950 disabled:opacity-50"
        >
          <Upload size={16} />
          {busy ? "Uploading…" : "Upload documents"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple={!replaceTargetId}
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files, replaceTargetId)}
        />
      </ReGlass>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase",
            filter === "all" ? "border-emerald-400/40 bg-emerald-500/20 text-lime-200" : "border-emerald-400/15 text-emerald-200/55",
          )}
        >
          All ({docs.length})
        </button>
        {REAL_ESTATE_DOC_CATEGORIES.filter((c) => byCategory.has(c.value)).map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase",
              filter === c.value ? "border-emerald-400/40 bg-emerald-500/20 text-lime-200" : "border-emerald-400/15 text-emerald-200/55",
            )}
          >
            {c.label} ({byCategory.get(c.value) ?? 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <ReGlass className="p-8 text-center text-sm font-semibold text-emerald-200/55">
          Vault is empty — upload Lalpurja, deeds, IDs, and more.
        </ReGlass>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((doc) => (
            <ReGlass key={doc.id} className="p-2.5">
              <button type="button" className="block w-full text-left" onClick={() => { setPreview(doc); setZoom(1); }}>
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black/40 ring-1 ring-emerald-400/15">
                  {isImageDoc(doc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-emerald-300/60">
                      <FileText size={28} />
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-black text-emerald-50">{doc.name}</p>
                <ReBadge>{REAL_ESTATE_DOC_CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}</ReBadge>
              </button>
              <div className="mt-2 flex flex-wrap gap-1">
                <IconMini label="Preview" onClick={() => { setPreview(doc); setZoom(1); }} icon={<Eye size={14} />} />
                <IconMini label="Rename" onClick={() => { setRenameId(doc.id); setRenameValue(doc.name); }} icon={<Pencil size={14} />} />
                <IconMini
                  label="Replace"
                  onClick={() => {
                    setReplaceTargetId(doc.id);
                    inputRef.current?.click();
                  }}
                  icon={<Replace size={14} />}
                />
                <IconMini label="Download" onClick={() => downloadDoc(doc)} icon={<Download size={14} />} />
                <IconMini label="Share" onClick={() => void shareDoc(doc)} icon={<Share2 size={14} />} />
                <IconMini
                  label="Delete"
                  tone="rose"
                  onClick={() => persist(docs.filter((d) => d.id !== doc.id))}
                  icon={<Trash2 size={14} />}
                />
              </div>
            </ReGlass>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <ReGlass key={doc.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/40 ring-1 ring-emerald-400/15">
                  {isImageDoc(doc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText size={20} className="text-emerald-300/70" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-emerald-50">{doc.name}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/50">
                    {REAL_ESTATE_DOC_CATEGORIES.find((c) => c.value === doc.category)?.label}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <IconMini label="Open" onClick={() => { setPreview(doc); setZoom(1); }} icon={<Eye size={14} />} />
                <IconMini label="Rename" onClick={() => { setRenameId(doc.id); setRenameValue(doc.name); }} icon={<Pencil size={14} />} />
                <IconMini
                  label="Replace"
                  onClick={() => {
                    setReplaceTargetId(doc.id);
                    inputRef.current?.click();
                  }}
                  icon={<Replace size={14} />}
                />
                <IconMini label="Download" onClick={() => downloadDoc(doc)} icon={<Download size={14} />} />
                <IconMini label="Share" onClick={() => void shareDoc(doc)} icon={<Share2 size={14} />} />
                <IconMini
                  label="Delete"
                  tone="rose"
                  onClick={() => persist(docs.filter((d) => d.id !== doc.id))}
                  icon={<Trash2 size={14} />}
                />
              </div>
            </ReGlass>
          ))}
        </div>
      )}

      {renameId ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <ReGlass className="w-full max-w-md p-4">
            <p className="text-sm font-black text-emerald-50">Rename document</p>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-emerald-400/20 bg-black/40 px-3.5 py-3 text-sm font-semibold text-emerald-50"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-2xl border border-emerald-400/20 text-sm font-black text-emerald-200"
                onClick={() => setRenameId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-2xl bg-emerald-400 text-sm font-black text-emerald-950"
                onClick={() => {
                  const name = renameValue.trim().slice(0, 180);
                  if (!name) return;
                  persist(docs.map((d) => (d.id === renameId ? { ...d, name, updatedAt: new Date().toISOString() } : d)));
                  setRenameId(null);
                }}
              >
                Save
              </button>
            </div>
          </ReGlass>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/95">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="truncate text-sm font-black text-emerald-50">{preview.name}</p>
            <div className="flex items-center gap-1">
              {isImageDoc(preview) ? (
                <>
                  <button type="button" className="grid h-11 w-11 place-items-center text-emerald-100" onClick={() => setZoom((z) => Math.min(3, z + 0.35))}>
                    <ZoomIn size={20} />
                  </button>
                  <button type="button" className="grid h-11 w-11 place-items-center text-emerald-100" onClick={() => setZoom((z) => Math.max(1, z - 0.35))}>
                    <ZoomOut size={20} />
                  </button>
                </>
              ) : null}
              <button type="button" className="grid h-11 w-11 place-items-center text-emerald-100" onClick={() => downloadDoc(preview)}>
                <Download size={20} />
              </button>
              <button type="button" className="grid h-11 w-11 place-items-center text-emerald-100" onClick={() => { setPreview(null); setZoom(1); }}>
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            {isImageDoc(preview) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `scale(${zoom})` }} />
            ) : isPdfDoc(preview) ? (
              <iframe title={preview.name} src={preview.url} className="h-full min-h-[70vh] w-full max-w-3xl rounded-2xl bg-white" />
            ) : (
              <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-emerald-300 underline">
                Open file
              </a>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconMini({
  label,
  icon,
  onClick,
  tone = "emerald",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "emerald" | "rose";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl border",
        tone === "rose"
          ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
          : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
      )}
    >
      {icon}
    </button>
  );
}
