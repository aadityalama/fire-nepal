import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * Non-secret auth/env diagnostics for Preview vs Production debugging.
 * Never returns key material — only booleans and deployment metadata.
 */
export async function GET() {
  const vercelEnv = (process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "").trim() || null;
  const configured = isSupabaseConfigured();
  return NextResponse.json({
    ok: true,
    supabaseConfigured: configured,
    authMode: configured ? "supabase" : "legacy",
    vercelEnv,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
