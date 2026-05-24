import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Placeholder until transactional email is wired; avoids account enumeration. */
export async function POST(req: Request) {
  try {
    await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  await new Promise((r) => setTimeout(r, 400));
  return NextResponse.json({ ok: true });
}
