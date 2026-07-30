"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  hardOnChromeIOS?: boolean;
  prefetch?: boolean;
};

function isChromeIOS() {
  if (typeof navigator === "undefined") return false;
  return /CriOS/i.test(navigator.userAgent) || (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent));
}

/**
 * Next <Link> soft-nav can reuse a stale chunk graph on Chrome iOS after deploys.
 * For critical workspaces (Insurance), optionally force a hard navigation on CriOS.
 */
export function SafeWorkspaceLink({ hardOnChromeIOS = false, href, className, children, prefetch }: Props) {
  const [hard, setHard] = useState(false);

  useEffect(() => {
    if (hardOnChromeIOS && isChromeIOS()) setHard(true);
  }, [hardOnChromeIOS]);

  if (hard) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} prefetch={prefetch}>
      {children}
    </Link>
  );
}
