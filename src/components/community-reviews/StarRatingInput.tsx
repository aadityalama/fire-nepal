"use client";

import { Star } from "lucide-react";

type StarRatingInputProps = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: number;
};

export function StarRatingInput({ value, onChange, disabled, size = 28 }: StarRatingInputProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={active}
            onClick={() => onChange(star)}
            className="rounded-lg p-0.5 transition hover:scale-105 disabled:opacity-50"
          >
            <Star
              size={size}
              className={active ? "fill-amber-400 text-amber-400" : "text-emerald-200"}
              strokeWidth={active ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}
