# Password reset email delivery (FIRE Nepal)

This document ties **observable behavior** to **official provider rules**, lists **exact dashboard steps** for a production fix (Resend SMTP in Supabase), and maps **application code** to the reset flow. It does **not** substitute for reading your own Vercel and Supabase logs once per incident.

## Code path (definitive)

| Step | Where |
|------|--------|
| User submits email | `src/components/product/auth/ForgotPasswordScreen.tsx` → `POST /api/auth/request-password-reset` when `isSupabaseConfigured()` |
| Origin for `redirectTo` | `getSiteOriginForServerAuthRedirect(req)` in `src/lib/public-site-url.ts`: **`NEXT_PUBLIC_SITE_URL`** (trimmed, no trailing slash) if set; otherwise `new URL(request.url).origin` |
| Supabase call | `app/api/auth/request-password-reset/route.ts` → `supabase.auth.resetPasswordForEmail(email, { redirectTo })` with `redirectTo` = `{origin}/auth/callback?next=` + encoded `/dashboard/security?pw=1` |
| Vercel structured logs | Prefix **`[FIRE Nepal auth][request-password-reset]`** with JSON events: `reset_request_received`, `supabase_reset_attempt`, **`supabase_reset_accepted`**, **`supabase_reset_rejected`** |

**Important:** `supabase_reset_accepted` means the **Supabase Auth API returned no error** to the JS client for `resetPasswordForEmail`. It does **not** prove the message reached the recipient’s MX server or inbox. Inbox delivery is entirely **Supabase Auth mail configuration + DNS + recipient filters**.

## Official root cause: Supabase built-in (“default”) email

Supabase documents that the **default / built-in SMTP** is **not for production** and imposes strict rules. In particular (verbatim meaning from their guide):

- Without **custom SMTP**, Auth is restricted to **pre-authorized addresses** tied to the **organization team**.
- Non–team-member addresses are refused with the error message **`Email address not authorized`**.

Source: [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) (Supabase Docs).

**Conclusion you can verify (not guess):**

1. In **Vercel → Logs**, search for `supabase_reset_rejected`. If you see **`Email address not authorized`** (or similar) in `message`, the root cause matches Supabase’s documented built-in restriction for that recipient.
2. If you see **`supabase_reset_accepted`** for a **non–team** Gmail address while still on built-in mail, pull **Supabase Auth / mail logs** for the same timestamp; the HTTP layer may still accept the reset request while mail policy blocks delivery (confirm in Supabase project logs/support). The **durable production fix** remains: **custom SMTP**.

## What to verify (checklist)

### 1. Vercel Production — `NEXT_PUBLIC_SITE_URL`

- **Vercel → Project → Settings → Environment Variables → Production**
- Set to the canonical HTTPS origin, e.g. `https://firenepal.com` (no trailing slash).
- **Redeploy** after changes (`NEXT_PUBLIC_*` is baked into the client at build time).

### 2. Supabase — URL configuration

- **Authentication → URL configuration**
- **Site URL**: production site (e.g. `https://firenepal.com`).
- **Redirect URLs**: must include the exact callback used in email links, e.g. `https://firenepal.com/auth/callback` (and `www` if you use it).

Mismatch here typically yields **`supabase_reset_rejected`** (allowlist / redirect errors), not silent inbox success.

### 3. Supabase — Email / SMTP

- **Authentication → Emails** (labels may vary by dashboard version) / **SMTP Settings**
- If **only** built-in email is enabled, treat it as **non-production** per Supabase and migrate to **custom SMTP** for real users.

### 4. Production logs (Vercel)

Filter logs for:

- `supabase_reset_accepted` → GoTrue returned no error to the app for this call.
- `supabase_reset_rejected` → inspect JSON fields **`message`**, **`code`**, **`status`** (app logs these after the logging update in `request-password-reset`).

This repository **cannot** read your Vercel or Supabase dashboards; operators must capture one failing request’s log line for a definitive incident readout.

## Permanent fix: Resend SMTP inside Supabase

Auth emails (including password reset) are sent by **Supabase Auth’s mailer**, not by this app’s `RESEND_API_KEY` used for legacy OTP / cron (see `docs/SUPABASE.md`). The production pattern is: **Resend account + verified domain → Supabase “Custom SMTP”**.

### Resend — account and API key

1. Create or use a Resend account.
2. Create an **API key** (used as SMTP password below).
3. **Domains → Add domain** (e.g. `firenepal.com` or a subdomain such as `auth.firenepal.com`). Resend recommends sending from a **subdomain** for reputation isolation.

### DNS records (exact values)

**You cannot copy generic TXT values from this repo** — Resend generates **per-domain** DKIM (and related) host/value pairs.

1. In **Resend → Domains → [your domain] → Records** (or equivalent), Resend lists the exact **TXT** / **MX** records to add at your DNS host.
2. Click **Verify** in Resend until the domain shows **verified** for sending.
3. Optionally add **DMARC** (your policy), e.g. a TXT record at `_dmarc.yourdomain` — Supabase recommends SPF, DKIM, and DMARC for deliverability: same [custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

### Resend — SMTP parameters (authoritative)

From [Resend: Send emails with SMTP](https://resend.com/docs/send-with-smtp):

| Field | Value |
|--------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SMTPS) or `587` (STARTTLS), or other documented ports |
| Username | `resend` |
| Password | Your Resend **API key** |

Security modes are documented in Resend’s port table (465 = implicit TLS; 587 = STARTTLS).

### Supabase — SMTP settings (map to dashboard)

Supabase’s **Management API** field names (same guide) map conceptually to the dashboard:

| Supabase / API concept | Use with Resend |
|------------------------|-----------------|
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` or `587` (match TLS mode) |
| SMTP user | `resend` |
| SMTP password | Resend API key |
| Sender / admin email | A **verified** address on your Resend domain, e.g. `auth@auth.firenepal.com` |
| Sender name | e.g. `FIRE Nepal` |

Enable **custom SMTP** in the Supabase dashboard and save.

After enabling custom SMTP, Supabase may apply a **low initial rate limit** (documented as on the order of **30 emails/hour** until you raise it). Adjust under **Authentication → Rate Limits** (or the current equivalent in your project).

Reference: [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## End-to-end test (operator)

1. Configure Resend domain + Supabase custom SMTP as above.
2. In production (or staging with the same Supabase project + SMTP), request reset for a **real** address that is **not** required to be on the Supabase org team.
3. Confirm **`supabase_reset_accepted`** in Vercel and a delivered message (inbox or spam first pass).
4. Open the link; confirm landing on `/auth/callback` then **Security** with `pw=1`; complete **Update password** (`auth.updateUser`).

## Final report template (fill after you run checks)

| Item | Result |
|------|--------|
| Root cause | e.g. built-in SMTP team restriction / redirect error / rate limit / spam (from logs + Supabase docs) |
| Fix applied | e.g. custom SMTP (Resend) + domain verified + rate limits updated |
| Remaining issues | e.g. DMARC monitoring, separate auth subdomain |
| Dashboard changes | Vercel env, Supabase SMTP, Redirect URLs, Rate limits |
