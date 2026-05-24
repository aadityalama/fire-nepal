/** Server-only auth environment. */

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "fire-nepal-local-dev-secret-change-me";
}
