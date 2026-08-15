import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

/**
 * Mirrors src/lib/public-site-url.ts — keep in sync with shouldUseCanonicalSiteUrl.
 * (Plain node --test cannot import the TS module without tsx.)
 */
function shouldUseCanonicalSiteUrl(envBag) {
  const env = (envBag.NEXT_PUBLIC_VERCEL_ENV || envBag.VERCEL_ENV || "").trim();
  return env !== "preview" && env !== "development";
}

function getSiteOriginForServerAuthRedirect(requestUrl, envBag) {
  if (shouldUseCanonicalSiteUrl(envBag)) {
    const raw = (envBag.NEXT_PUBLIC_SITE_URL || "").trim();
    if (raw) return raw.replace(/\/+$/, "");
  }
  return new URL(requestUrl).origin;
}

describe("public-site-url Preview vs Production", () => {
  it("uses NEXT_PUBLIC_SITE_URL on production Vercel", () => {
    const origin = getSiteOriginForServerAuthRedirect(
      "https://preview.example/api/auth/request-password-reset",
      {
        NEXT_PUBLIC_VERCEL_ENV: "production",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://firenepal.com/",
      },
    );
    assert.equal(origin, "https://firenepal.com");
  });

  it("ignores NEXT_PUBLIC_SITE_URL on Preview so redirects stay on the preview host", () => {
    const origin = getSiteOriginForServerAuthRedirect(
      "https://fire-nepal-git-branch.vercel.app/api/auth/request-password-reset",
      {
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SITE_URL: "https://firenepal.com",
      },
    );
    assert.equal(origin, "https://fire-nepal-git-branch.vercel.app");
  });

  it("ignores NEXT_PUBLIC_SITE_URL on Vercel development", () => {
    assert.equal(shouldUseCanonicalSiteUrl({ VERCEL_ENV: "development" }), false);
  });
});

describe("assert-supabase-env-on-vercel", () => {
  it("exits 0 locally without VERCEL", () => {
    const r = spawnSync(process.execPath, ["scripts/assert-supabase-env-on-vercel.mjs"], {
      env: { ...process.env, VERCEL: "", VERCEL_ENV: "" },
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
  });

  it("exits 1 on Vercel preview without Supabase public env", () => {
    const r = spawnSync(process.execPath, ["scripts/assert-supabase-env-on-vercel.mjs"], {
      env: {
        ...process.env,
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Missing NEXT_PUBLIC_SUPABASE/);
  });

  it("exits 0 on Vercel preview when Supabase public env is present", () => {
    const r = spawnSync(process.execPath, ["scripts/assert-supabase-env-on-vercel.mjs"], {
      env: {
        ...process.env,
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key_long_enough_for_check",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
  });
});
