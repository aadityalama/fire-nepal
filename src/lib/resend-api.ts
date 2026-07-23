/**
 * Shared Resend HTTP client (auth verification + smart-loan reminders).
 */

export type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export type ResendSendResult =
  | { ok: true; status: number; message: string; id?: string }
  | { ok: false; status: number; message: string };

/** From address: Resend docs recommend `RESEND_FROM_EMAIL`; `EMAIL_FROM` is supported as an alias. */
export function resolveResendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "FIRE Nepal <onboarding@fire-nepal.com>"
  );
}

export function isResendApiKeyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmailViaResend(payload: ResendEmailPayload): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[resend] RESEND_API_KEY is not configured");
    return { ok: false, status: 0, message: "RESEND_API_KEY is not configured" };
  }

  try {
    console.info("[resend] sending email", {
      to: payload.to,
      subject: payload.subject,
      from: payload.from,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      let id: string | undefined;
      try {
        const j = (await response.json()) as { id?: string };
        id = typeof j?.id === "string" ? j.id : undefined;
      } catch {
        /* ignore */
      }
      console.info("[resend] email accepted", { id: id ?? null, status: response.status });
      return { ok: true, status: response.status, message: "Email sent", id };
    }

    const details = (await response.text()).slice(0, 500);
    console.error("[resend] provider rejected email", { status: response.status, details });
    return {
      ok: false,
      status: response.status,
      message: details || "Email provider rejected the request",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown Resend network error";
    console.error("[resend] network error", message);
    return {
      ok: false,
      status: 0,
      message,
    };
  }
}
