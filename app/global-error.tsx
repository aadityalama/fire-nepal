"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

async function clearClientCaches() {
  try {
    if (typeof caches !== "undefined" && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* ignore */
  }
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[global-error]", error);
    }
  }, [error]);

  const recover = async () => {
    await clearClientCaches();
    window.location.href = `/?recover=${Date.now()}`;
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020806", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 24, margin: 0 }}>This page couldn’t load</h1>
          <p style={{ maxWidth: 360, color: "rgba(209,250,229,0.7)", fontSize: 14, margin: 0 }}>
            A stale browser cache (common on Chrome iPhone after deploys) can break Insurance and other
            workspaces. Clear cached assets and reload.
          </p>
          <p style={{ maxWidth: 360, color: "rgba(254,202,202,0.7)", fontSize: 11, wordBreak: "break-word" }}>
            {error?.message || "Unknown error"}
            {error?.digest ? ` · ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void recover()}
            style={{
              minHeight: 48,
              width: "100%",
              maxWidth: 320,
              borderRadius: 16,
              border: 0,
              background: "linear-gradient(90deg,#6ee7b7,#bef264)",
              color: "#022c22",
              fontWeight: 800,
            }}
          >
            Clear cache & reload
          </button>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 44,
              width: "100%",
              maxWidth: 320,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "#ecfdf5",
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
