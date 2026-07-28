/**
 * Atomic validation for a single official NEPSE index row.
 *
 * Rejects inconsistent snapshots instead of displaying mixed values.
 * Invariant: previous_close + point_change ≈ current_index
 * and percentage_change is derived from those same values.
 */

export type OfficialIndexRaw = {
  name: string;
  currentValue: number | null;
  close: number | null;
  previousClose: number | null;
  change: number | null;
  perChange: number | null;
  high: number | null;
  low: number | null;
  generatedTime: string | null;
};

export type ValidatedOfficialIndex = {
  name: string;
  currentIndex: number;
  previousClose: number;
  pointChange: number;
  percentageChange: number;
  high: number | null;
  low: number | null;
  generatedTime: string | null;
};

/** Absolute index-point tolerance for previous_close + change = current_index. */
export const INDEX_POINT_TOLERANCE = 0.05;
/** Absolute percentage-point tolerance vs published perChange. */
export const INDEX_PCT_TOLERANCE = 0.05;

export class OfficialIndexValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficialIndexValidationError";
  }
}

function nearlyEqual(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

/**
 * Resolve previous_close from the SAME official row so
 * previous_close + point_change = current_index.
 *
 * After hours, NEPSE sometimes resets `previousClose` toward `currentValue`
 * while `close` still holds the prior session print used by `change`.
 */
export function resolveConsistentPreviousClose(
  currentIndex: number,
  pointChange: number,
  publishedPreviousClose: number | null,
  sessionClose: number | null,
): number | null {
  const derived = currentIndex - pointChange;
  const candidates = [publishedPreviousClose, sessionClose, derived].filter(
    (value): value is number => value != null && Number.isFinite(value) && value > 0,
  );

  for (const candidate of candidates) {
    if (nearlyEqual(candidate + pointChange, currentIndex, INDEX_POINT_TOLERANCE)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Validate one official index record. Throws OfficialIndexValidationError on failure.
 */
export function validateOfficialIndexSnapshot(raw: OfficialIndexRaw): ValidatedOfficialIndex {
  if (!raw.name.trim()) {
    throw new OfficialIndexValidationError("Official index row missing name");
  }
  if (raw.currentValue == null || !Number.isFinite(raw.currentValue)) {
    throw new OfficialIndexValidationError(`Official ${raw.name}: missing currentValue`);
  }
  if (raw.change == null || !Number.isFinite(raw.change)) {
    throw new OfficialIndexValidationError(`Official ${raw.name}: missing point change`);
  }

  const currentIndex = raw.currentValue;
  const pointChange = raw.change;
  const previousClose = resolveConsistentPreviousClose(
    currentIndex,
    pointChange,
    raw.previousClose,
    raw.close,
  );

  if (previousClose == null) {
    throw new OfficialIndexValidationError(
      `Official ${raw.name}: rejected — previous_close + point_change ≠ current_index ` +
        `(prev=${raw.previousClose}, close=${raw.close}, change=${pointChange}, current=${currentIndex})`,
    );
  }

  if (!nearlyEqual(previousClose + pointChange, currentIndex, INDEX_POINT_TOLERANCE)) {
    throw new OfficialIndexValidationError(
      `Official ${raw.name}: rejected — previous_close (${previousClose}) + point_change (${pointChange}) ` +
        `≠ current_index (${currentIndex})`,
    );
  }

  if (!(previousClose > 0)) {
    throw new OfficialIndexValidationError(`Official ${raw.name}: invalid previous_close ${previousClose}`);
  }

  const percentageFromSameValues = (pointChange / previousClose) * 100;
  if (raw.perChange != null && Number.isFinite(raw.perChange)) {
    if (!nearlyEqual(raw.perChange, percentageFromSameValues, INDEX_PCT_TOLERANCE)) {
      throw new OfficialIndexValidationError(
        `Official ${raw.name}: rejected — published perChange (${raw.perChange}) ` +
          `≠ change/previous_close (${percentageFromSameValues.toFixed(4)})`,
      );
    }
  }

  return {
    name: raw.name,
    currentIndex,
    previousClose,
    pointChange,
    percentageChange:
      raw.perChange != null && Number.isFinite(raw.perChange)
        ? raw.perChange
        : Number(percentageFromSameValues.toFixed(4)),
    high: raw.high,
    low: raw.low,
    generatedTime: raw.generatedTime,
  };
}
