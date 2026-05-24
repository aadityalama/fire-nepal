/**
 * STEP 6D — Security & trust architecture notes (future production hooks).
 *
 * Planned layers:
 * - At-rest encryption for user profile / portfolio sync (AES-256-GCM envelope per tenant).
 * - TLS 1.3+ for all transport; httpOnly + Secure + SameSite session cookies.
 * - Refresh-token rotation, device-bound sessions, anomaly scoring on auth service.
 * - Cloud sync: E2E optional client-held keys with server ciphertext blobs only.
 *
 * Current stack: signed session cookie + local-first browser storage (dev/demo).
 */

export const SECURITY_ARCHITECTURE_VERSION = "6d-local-first-v1" as const;

export type SecurityRoadmapPhase = "session-hardening" | "db-encryption" | "cloud-sync-e2e" | "device-trust";

export const SECURITY_ROADMAP: ReadonlyArray<{ phase: SecurityRoadmapPhase; note: string }> = [
  { phase: "session-hardening", note: "Short-lived access + rotated refresh; revoke-all endpoint." },
  { phase: "db-encryption", note: "Envelope encryption for PII + portfolio snapshots at rest." },
  { phase: "cloud-sync-e2e", note: "Optional client keys; server never sees plaintext portfolio JSON." },
  { phase: "device-trust", note: "WebAuthn / passkeys + risk-based step-up for new devices." },
];
