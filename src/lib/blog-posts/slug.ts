/** URL-safe slug from a blog title. */
export function slugifyBlogTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}

export function normalizeReadingTime(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (/^\d+\s*min(ute)?s?\s*read$/i.test(value)) {
    const mins = value.match(/\d+/)?.[0] ?? "";
    return mins ? `${mins} min read` : value;
  }
  if (/^\d+$/.test(value)) return `${value} min read`;
  return value;
}
