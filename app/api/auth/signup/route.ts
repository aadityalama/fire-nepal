import { NextResponse } from "next/server";
import { startOrRefreshSignup } from "@/auth/server/user-store";

export const runtime = "nodejs";

const MAX_AVATAR_CHARS = 6_800_000; // ~5MB base64 data URL headroom

type Body = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  avatarUrl?: string | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  let avatarUrl: string | null =
    typeof body.avatarUrl === "string" && body.avatarUrl.length > 0 ? body.avatarUrl : null;
  if (avatarUrl && avatarUrl.length > MAX_AVATAR_CHARS) {
    return NextResponse.json({ error: "Profile image is too large (max 5MB)." }, { status: 400 });
  }

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Use at least 6 characters for your password." }, { status: 400 });
  }
  if (confirmPassword !== password) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const started = startOrRefreshSignup({ name, email, password, avatarUrl });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: 400 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[FIRE Nepal auth] Email verification OTP for ${started.email}: ${started.otp}`);
  }

  const resBody: {
    needsVerification: true;
    email: string;
    expiresAt: number;
    devCode?: string;
  } = {
    needsVerification: true,
    email: started.email,
    expiresAt: started.expiresAt,
  };
  if (process.env.NODE_ENV !== "production") {
    resBody.devCode = started.otp;
  }

  return NextResponse.json(resBody);
}
