"use client";

import { useEffect, useRef, useState } from "react";

const SOCIAL_LINKS = [
  {
    name: "Website",
    tooltip: "Visit Website",
    ariaLabel: "Visit FIRE Nepal website",
    href: "https://www.firenepal.com",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  },
  {
    name: "Facebook",
    tooltip: "Facebook",
    ariaLabel: "Follow FIRE Nepal on Facebook",
    href: "https://www.facebook.com/firenepal",
    path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z",
  },
  {
    name: "Instagram",
    tooltip: "Instagram",
    ariaLabel: "Follow FIRE Nepal on Instagram",
    href: "https://www.instagram.com/firenepal",
    path: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  },
  {
    name: "YouTube",
    tooltip: "YouTube",
    ariaLabel: "Follow FIRE Nepal on YouTube",
    href: "https://www.youtube.com/@firenepal",
    path: "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.55 12 3.55 12 3.55s-7.54 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.84.5 9.38.5 9.38.5s7.54 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z",
  },
  {
    name: "TikTok",
    tooltip: "TikTok",
    ariaLabel: "Follow FIRE Nepal on TikTok",
    href: "https://www.tiktok.com/@firenepal",
    path: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.03-1.49.16-2.22 1.3-4.38 3.14-5.64 1.94-1.4 4.56-1.77 6.8-.95.03 1.5-.01 3-.01 4.5-.8-.26-1.68-.37-2.53-.2-1.08.2-2.08.85-2.68 1.77-.47.72-.64 1.62-.5 2.47.23 1.43 1.37 2.63 2.8 2.9 1.11.22 2.28-.06 3.13-.8.63-.54.97-1.35 1.02-2.17.03-2.98.01-5.96.02-8.94z",
  },
  {
    name: "LinkedIn",
    tooltip: "LinkedIn",
    ariaLabel: "Follow FIRE Nepal on LinkedIn",
    href: "https://www.linkedin.com/company/firenepal",
    path: "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z",
  },
  {
    name: "Telegram",
    tooltip: "Telegram",
    ariaLabel: "Follow FIRE Nepal on Telegram",
    href: "https://t.me/firenepal",
    path: "M9.78 14.65l-.29 4.12c.42 0 .6-.18.82-.4l1.97-1.89 4.08 3c.75.42 1.28.2 1.49-.7L22.9 3.87c.33-1.48-.53-2.06-1.5-1.7L2.15 9.3c-1.43.56-1.41 1.36-.25 1.72l4.96 1.55 11.52-7.26c.54-.36 1.04-.16.63.2L9.78 14.65z",
  },
] as const;

export function FooterSocialFollow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="mt-10 text-center transition-[opacity,transform] duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <h3 className="text-xl font-black sm:text-2xl">🌐 Follow FIRE Nepal</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-emerald-50/75">
        Connect with FIRE Nepal for financial updates, investment insights, and exclusive content.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-[18px]">
        {SOCIAL_LINKS.map(({ name, tooltip, ariaLabel, href, path }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            title={tooltip}
            className="group relative grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center rounded-full border border-emerald-400/35 bg-white/10 text-white shadow-[0_8px_24px_rgba(2,31,26,0.35),0_0_0_1px_rgba(16,185,129,0.08)] backdrop-blur-md transition-all duration-[250ms] ease-out hover:-translate-y-[3px] hover:scale-[1.08] hover:border-emerald-400/70 hover:bg-emerald-500/90 hover:shadow-[0_12px_32px_rgba(16,185,129,0.45),0_0_24px_rgba(16,185,129,0.35)] focus:outline-none focus-visible:-translate-y-[3px] focus-visible:scale-[1.08] focus-visible:border-emerald-300 focus-visible:bg-emerald-500/90 focus-visible:shadow-[0_12px_32px_rgba(16,185,129,0.45),0_0_24px_rgba(16,185,129,0.35)] focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#063f31]"
          >
            <span
              className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-emerald-950/95 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-50 opacity-0 shadow-lg shadow-emerald-950/40 transition-all duration-[250ms] ease-out group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              {tooltip}
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d={path} />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
