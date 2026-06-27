import type { InfoChipData } from "@/lib/smart-nepal-info";

type InfoChipProps = {
  chip: InfoChipData;
  compact?: boolean;
};

export function InfoChip({ chip, compact = false }: InfoChipProps) {
  return (
    <article
      aria-label={`${chip.label}: ${chip.value}`}
      className="smart-nepal-info-chip group shrink-0 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition hover:border-emerald-200/35 hover:bg-white/14 sm:px-3.5 sm:py-2.5"
      data-chip-kind={chip.kind}
    >
      <p className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-100/78 sm:text-[0.65rem]">
        <span aria-hidden className="text-[0.72rem] leading-none sm:text-[0.78rem]">
          {chip.emoji}
        </span>
        <span className="truncate">{chip.label}</span>
      </p>
      <p
        className={`mt-0.5 font-black leading-tight text-white ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-[0.95rem]"}`}
      >
        {chip.value}
      </p>
      {chip.subValue ? (
        <p className="mt-0.5 text-[0.68rem] font-semibold leading-snug text-emerald-50/72 sm:text-[0.72rem]">
          {chip.subValue}
        </p>
      ) : null}
    </article>
  );
}
