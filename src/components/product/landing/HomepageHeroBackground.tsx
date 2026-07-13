import { HOMEPAGE_HERO_BACKGROUND_URL } from "@/lib/homepage-hero";

/** Branded homepage hero backdrop — static asset only, never profile avatars. */
export function HomepageHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HOMEPAGE_HERO_BACKGROUND_URL}
        alt=""
        className="absolute inset-0 h-full w-full max-h-full max-w-full object-cover"
        decoding="async"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#fafffc]/98 via-[#fafffc]/90 to-[#fafffc]/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.74)_0_9rem,transparent_9.4rem)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(0,122,61,0.16),transparent_18rem)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/18 to-amber-500/10" />
    </div>
  );
}
