"use client";

import { ImagePlus, PencilLine, Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from "react";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_BYTES = 5 * 1024 * 1024;

type AvatarUploadZoneProps = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  /** Inline row for dashboard profile; default is large signup-style drop zone */
  variant?: "default" | "compact";
};

function useClickOutsideWhenOpen(open: boolean, rootRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      onClose();
    };
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, rootRef, onClose]);
}

export function AvatarUploadZone({ value, onChange, disabled, variant = "default" }: AvatarUploadZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);
  const [desktopOverlayOpen, setDesktopOverlayOpen] = useState(false);

  const overlayDismissOpen = mobileOverlayOpen || desktopOverlayOpen;
  const closeOverlays = useCallback(() => {
    setMobileOverlayOpen(false);
    setDesktopOverlayOpen(false);
  }, []);
  useClickOutsideWhenOpen(overlayDismissOpen, rootRef, closeOverlays);

  useEffect(() => {
    if (!value) {
      setMobileOverlayOpen(false);
      setDesktopOverlayOpen(false);
    }
  }, [value]);

  const processFile = useCallback(
    (file: File | undefined) => {
      setError(null);
      if (!file) return;
      const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      if (!okType) {
        setError("Use JPG, PNG, or WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Max file size is 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result;
        if (typeof r === "string") {
          onChange(r);
          setMobileOverlayOpen(false);
          setDesktopOverlayOpen(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      processFile(f);
    },
    [disabled, processFile],
  );

  const openPicker = useCallback(() => {
    if (disabled) return;
    setMobileOverlayOpen(false);
    setDesktopOverlayOpen(false);
    inputRef.current?.click();
  }, [disabled]);

  const imgClass =
    variant === "compact"
      ? "h-full w-full object-cover"
      : "h-full w-full object-cover";

  const frameClass =
    variant === "compact"
      ? "relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl shadow-[0_0_24px_rgba(16,185,129,0.12)] ring-2 ring-emerald-400/25 transition-shadow duration-300 motion-safe:hover:shadow-[0_0_32px_rgba(16,185,129,0.22)] sm:w-[72px] sm:rounded-2xl"
      : "relative mx-auto aspect-square w-24 overflow-hidden rounded-2xl shadow-[0_0_28px_rgba(16,185,129,0.14)] ring-2 ring-emerald-400/25 transition-shadow duration-300 motion-safe:hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]";

  const overlayClass = [
    "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-emerald-950/55 px-2 backdrop-blur-[6px] transition-all duration-300 ease-out motion-safe:md:transition-transform",
    "pointer-events-none opacity-0 scale-[0.98]",
    mobileOverlayOpen ? "max-md:pointer-events-auto max-md:opacity-100 max-md:scale-100" : "max-md:opacity-0 max-md:scale-[0.98]",
    "md:scale-[0.98] md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-hover:scale-100",
    "md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-focus-within:scale-100",
    desktopOverlayOpen
      ? "md:pointer-events-auto md:opacity-100 md:scale-100 md:group-hover:pointer-events-auto"
      : "",
  ].join(" ");

  const filledPhotoBlock = value ? (
    <div ref={rootRef} className={variant === "compact" ? "block w-full max-w-full" : "flex justify-center"}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter") {
            e.preventDefault();
            if (window.matchMedia("(max-width: 767px)").matches) {
              setMobileOverlayOpen((o) => !o);
            } else {
              openPicker();
            }
            return;
          }
          if (e.key === " ") {
            e.preventDefault();
            if (window.matchMedia("(max-width: 767px)").matches) {
              setMobileOverlayOpen((o) => !o);
            } else {
              setDesktopOverlayOpen((o) => !o);
            }
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={(e) => {
          if (disabled) return;
          if (e.target instanceof HTMLElement && e.target.closest("[data-overlay-action]")) return;
          if (window.matchMedia("(min-width: 768px)").matches) {
            setDesktopOverlayOpen((o) => !o);
            return;
          }
          e.preventDefault();
          setMobileOverlayOpen((o) => !o);
        }}
        className={`group relative cursor-pointer outline-none ring-emerald-400/40 focus-visible:ring-2 ${frameClass} ${
          dragOver ? "ring-emerald-400/55 shadow-[0_0_36px_rgba(16,185,129,0.28)]" : ""
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            processFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Profile photo" className={imgClass} />
        <div className={overlayClass}>
          <button
            type="button"
            data-overlay-action
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold tracking-wide text-emerald-50 shadow-sm backdrop-blur-md transition hover:border-emerald-300/40 hover:bg-emerald-500/25"
          >
            <PencilLine size={14} className="text-emerald-200/90" strokeWidth={2} />
            Change photo
          </button>
          <button
            type="button"
            data-overlay-action
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              closeOverlays();
            }}
            className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-200"
          >
            Remove photo
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const zoneClass =
    variant === "compact"
      ? `relative flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 transition motion-safe:duration-300 ${
          dragOver
            ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_28px_rgba(16,185,129,0.12)]"
            : "border-white/12 bg-black/30 hover:border-emerald-400/35 hover:bg-emerald-500/[0.06]"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`
      : `relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 transition motion-safe:duration-300 ${
          dragOver
            ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
            : "border-white/12 bg-black/25 hover:border-emerald-400/35 hover:bg-emerald-500/[0.06]"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`;

  if (value) {
    return (
      <div className={variant === "compact" ? "w-full space-y-1.5" : "space-y-2"}>
        {variant === "default" ? (
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
            Profile photo <span className="font-semibold text-emerald-200/35">(optional)</span>
          </span>
        ) : (
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300/50">
            Profile photo <span className="font-semibold text-emerald-200/35">(optional)</span>
          </span>
        )}
        {filledPhotoBlock}
        {error ? <p className="text-xs font-semibold text-amber-200/90">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={variant === "compact" ? "w-full space-y-1.5" : "space-y-2"}>
      {variant === "default" ? (
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
          Profile photo <span className="font-semibold text-emerald-200/35">(optional)</span>
        </span>
      ) : (
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300/50">
          Profile photo <span className="font-semibold text-emerald-200/35">(optional)</span>
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={zoneClass}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            processFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {variant === "compact" ? (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 sm:h-[72px] sm:w-[72px] sm:rounded-2xl">
            <ImagePlus size={24} strokeWidth={1.75} />
          </div>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
              <ImagePlus size={28} strokeWidth={1.75} />
            </div>
            <p className="text-center text-sm font-semibold text-emerald-100/80">
              Drag & drop or <span className="text-emerald-300">browse</span>
            </p>
            <p className="text-center text-[11px] font-medium text-zinc-500">JPG, PNG, WEBP · max 5MB</p>
          </>
        )}
        {variant === "compact" ? (
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold text-emerald-100/90">Tap or drop to add</p>
            <p className="mt-0.5 text-[10px] font-medium text-zinc-500">JPG, PNG, WEBP · max 5MB</p>
          </div>
        ) : null}
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 font-black uppercase tracking-wider text-emerald-200/90 ${
            variant === "compact" ? "px-2.5 py-1 text-[9px]" : "px-3 py-1 text-[10px]"
          }`}
        >
          <Upload size={variant === "compact" ? 11 : 12} />
          Upload
        </span>
      </div>
      {error ? <p className="text-xs font-semibold text-amber-200/90">{error}</p> : null}
    </div>
  );
}
