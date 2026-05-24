import { NextResponse } from "next/server";
import { resendOtp } from "@/auth/server/user-store";

export const runtime = "nodejs";

type Body = { email?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const r = resendOtp(email);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[FIRE Nepal auth] Resent email verification OTP for ${email}: ${r.otp}`);
  }

  const payload: { ok: true; expiresAt: number; devCode?: string } = {
    ok: true,
    expiresAt: r.expiresAt,
  };
  if (process.env.NODE_ENV !== "production") {
    payload.devCode = r.otp;
  }

  return NextResponse.json(payload);
}
