/** Tiny className joiner — avoids a new dependency for the Real Estate redesign. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
