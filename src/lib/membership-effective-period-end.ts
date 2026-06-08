/**
 * Canonical end of the current paid membership window for reads.
 * Prefer `subscriptions.current_period_end` (billing ledger); fall back to
 * `profiles.expires_at` when the column exists and is populated (denormalized mirror).
 */
export function effectiveMembershipPeriodEnd(
  subscriptionCurrentPeriodEnd: string | null | undefined,
  profileExpiresAt: string | null | undefined,
): string | null {
  const fromSub = subscriptionCurrentPeriodEnd?.trim();
  if (fromSub) return fromSub;
  const fromProfile = profileExpiresAt?.trim();
  return fromProfile || null;
}
