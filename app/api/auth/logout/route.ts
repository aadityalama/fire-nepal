import { NextResponse } from "next/server";
import { FN_SESSION_COOKIE } from "@/auth/constants";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";

async function POSTHandler() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export const POST = withApiRouteTiming("auth/logout:POST", POSTHandler);
