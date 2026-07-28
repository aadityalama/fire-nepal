import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FN_SESSION_COOKIE } from "@/auth/constants";
import { getAuthSecret } from "@/auth/server/env";
import { verifyUserSession } from "@/auth/server/session-token";
import { getVerifiedUserByEmail, toPublicUser } from "@/auth/server/user-store";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";

async function GETHandler() {
  const cookieStore = await cookies();
  const token = cookieStore.get(FN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const base = verifyUserSession(token, getAuthSecret());
  if (!base) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const stored = getVerifiedUserByEmail(base.email);
  const user = stored ? toPublicUser(stored) : base;
  return NextResponse.json({ user });
}

export const GET = withApiRouteTiming("auth/session:GET", GETHandler);
