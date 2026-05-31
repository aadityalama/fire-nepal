import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FN_PROTECTED_PREFIXES, FN_SESSION_COOKIE } from "@/auth/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function isProtectedPath(pathname: string): boolean {
  return FN_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const LEGACY_SSF_PENSION = "/portfolio/ssf-pension";

function redirectLegacySsfPension(pathname: string, request: NextRequest): NextResponse | null {
  const trimmed = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (trimmed !== LEGACY_SSF_PENSION && !trimmed.startsWith(`${LEGACY_SSF_PENSION}/`)) return null;

  const suffix = trimmed === LEGACY_SSF_PENSION ? "/" : trimmed.slice(LEGACY_SSF_PENSION.length) || "/";
  const map: Record<string, string> = {
    "/": "/portfolio/pension",
    "/contribution-history": "/portfolio/pension/contribution-history",
    "/pension-projection": "/portfolio/pension/retirement-projection",
    "/retirement-readiness": "/portfolio/pension/retirement-projection",
    "/claim-benefits": "/portfolio/pension/benefits-center",
    "/reminder-center": "/portfolio/pension/reminder-center",
    "/retirement-timeline": "/portfolio/pension/withdrawal-planner",
    "/family-protection": "/portfolio/pension/family-protection",
  };
  const dest = map[suffix] ?? "/portfolio/pension";
  const url = request.nextUrl.clone();
  url.pathname = dest;
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyRedirect = redirectLegacySsfPension(pathname, request);
  if (legacyRedirect) return legacyRedirect;

  if (isSupabaseConfigured()) {
    const { response, user } = await updateSupabaseSession(request);
    if (isProtectedPath(pathname) && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const legacy = NextResponse.next();
  if (!isProtectedPath(pathname)) {
    return legacy;
  }

  const token = request.cookies.get(FN_SESSION_COOKIE)?.value;
  if (!token || token.length < 12) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return legacy;
}

export const config = {
  matcher: [
    "/hub",
    "/hub/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/account",
    "/account/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/portfolio",
    "/portfolio/:path*",
    "/family",
    "/family/:path*",
    "/children",
    "/children/:path*",
    "/education",
    "/education/:path*",
    "/health",
    "/health/:path*",
    "/family-calendar",
    "/family-calendar/:path*",
    "/parenting-ai",
    "/parenting-ai/:path*",
    "/family-ai-insights",
    "/family-ai-insights/:path*",
    "/family-settings",
    "/family-settings/:path*",
    "/child-records-vault",
    "/child-records-vault/:path*",
    "/auth/callback",
  ],
};
