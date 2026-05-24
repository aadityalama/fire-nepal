/**
 * Minimal layout: `/market` redirects to `/portfolio` in `page.tsx`.
 * Keeps the route segment present for Next.js route typing after layout was removed.
 */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
