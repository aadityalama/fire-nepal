export function formatNpr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "unavailable";
  return `NPR ${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "unavailable";
  return `${Math.round(value)}%`;
}

export function compactLines(lines: Array<string | null | false | undefined>): string {
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
