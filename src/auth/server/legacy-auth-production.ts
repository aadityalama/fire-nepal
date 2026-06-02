import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Legacy auth keeps verified users in an in-memory Map (see user-store.ts).
 * On Vercel/serverless that Map is not shared across instances or durable across cold starts,
 * so signup/login appears to work until the next request hits a different worker.
 */
export function isLegacyAuthBlockedInProduction(): boolean {
  return process.env.NODE_ENV === "production" && !isSupabaseConfigured();
}

export function legacyAuthNotPersistedResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "This host cannot persist email/password accounts without Supabase. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and redeploy). Legacy auth only works for local development.",
    },
    { status: 503 },
  );
}
