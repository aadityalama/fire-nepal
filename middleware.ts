import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FN_PROTECTED_PREFIXES, FN_SESSION_COOKIE } from "@/auth/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function isProtectedPath(pathname: string): boolean {
  return FN_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    "/auth/callback",
  ],
};
