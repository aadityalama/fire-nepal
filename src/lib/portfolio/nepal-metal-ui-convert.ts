/**
 * UI gram ↔ tola conversion for holdings entry (FIRE Nepal product spec).
 * Board pricing still comes from FENEGOSIDA; this constant is display/input only.
 */
export const NEPAL_UI_GRAMS_PER_TOLA = 11.66 as const;

export function gramsToTolaUi(grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  return grams / NEPAL_UI_GRAMS_PER_TOLA;
}

export function tolaUiToGrams(tola: number): number {
  if (!Number.isFinite(tola) || tola <= 0) return 0;
  return tola * NEPAL_UI_GRAMS_PER_TOLA;
}
