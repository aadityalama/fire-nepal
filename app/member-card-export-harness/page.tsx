"use client";

import { useRef, useState } from "react";
import { MemberCardExport } from "@/components/membership/MemberCardExport";
import type { MemberCardData } from "@/lib/member-card-profile";
import {
  downloadMemberCardPdfFromElement,
  downloadMemberCardPngFromElement,
  memberCardPngBlobFromElement,
} from "@/lib/member-card-export";

const MOCK_CARD: MemberCardData = {
  fullName: "Aaditya Lama",
  fireNepalId: "FN-2026-00421",
  avatarUrl: null,
  membershipPlan: "premium",
  membershipStart: "2025-01-15",
  membershipExpiry: "2027-01-15",
  country: "Nepal",
  countryOfWork: "South Korea",
  preferredCurrency: "KRW",
  phone: "+82 10-1234-5678",
  email: "aaditya@firenepal.com",
};

export default function MemberCardExportHarnessPage() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("ready");
  const [pngSize, setPngSize] = useState<string>("");

  return (
    <main style={{ padding: 24, background: "#111", minHeight: "100vh", color: "#fff" }}>
      <h1 data-testid="harness-title">Member Card Export Harness</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          data-testid="measure-layout"
          onClick={() => {
            const el = exportRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const name = el.querySelector("h2");
            const nameRect = name?.getBoundingClientRect();
            const photo = el.querySelector("[data-export-photo]");
            const idPanel = el.querySelector("[data-export-id]");
            const countdown = el.querySelector("[data-export-countdown]");
            const qr = el.querySelector("[data-export-qr]");
            const relative = (node: Element | null) => {
              if (!node) return null;
              const r = node.getBoundingClientRect();
              return {
                left: Math.round(r.left - rect.left),
                top: Math.round(r.top - rect.top),
                width: Math.round(r.width),
                height: Math.round(r.height),
              };
            };
            setMessage(
              JSON.stringify({
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                nameHeight: nameRect ? Math.round(nameRect.height) : null,
                nameTop: nameRect ? Math.round(nameRect.top - rect.top) : null,
                exportReady: el.getAttribute("data-export-ready"),
                photo: relative(photo),
                idPanel: relative(idPanel),
                countdown: relative(countdown),
                qr: relative(qr),
              }),
            );
          }}
        >
          Measure
        </button>
        <button
          type="button"
          data-testid="capture-png"
          onClick={() => {
            void (async () => {
              if (!exportRef.current) return;
              setMessage("capturing");
              try {
                const blob = await memberCardPngBlobFromElement(exportRef.current);
                setPngSize(String(blob.size));
                const url = URL.createObjectURL(blob);
                const img = document.getElementById("png-preview") as HTMLImageElement | null;
                if (img) img.src = url;
                setMessage("png-ok");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "png-failed");
              }
            })();
          }}
        >
          Capture PNG
        </button>
        <button
          type="button"
          data-testid="download-png"
          onClick={() => {
            void (async () => {
              if (!exportRef.current) return;
              await downloadMemberCardPngFromElement(exportRef.current, MOCK_CARD);
              setMessage("download-png-ok");
            })();
          }}
        >
          Download PNG
        </button>
        <button
          type="button"
          data-testid="download-pdf"
          onClick={() => {
            void (async () => {
              if (!exportRef.current) return;
              await downloadMemberCardPdfFromElement(exportRef.current, MOCK_CARD);
              setMessage("download-pdf-ok");
            })();
          }}
        >
          Download PDF
        </button>
      </div>
      <pre data-testid="harness-message">{message}</pre>
      <pre data-testid="png-size">{pngSize}</pre>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="png-preview" alt="" data-testid="png-preview" style={{ maxWidth: 700, border: "1px solid #444" }} />
      <div style={{ marginTop: 24, overflow: "auto" }}>
        <MemberCardExport ref={exportRef} data={MOCK_CARD} />
      </div>
    </main>
  );
}
