/**
 * Ensures every new reminder is registered for email delivery:
 * at least due-time + overdue slots when the client sends all-false flags.
 */
export function ensureEmailNotifyRegistration<
  T extends {
    notify7DaysBefore: boolean;
    notify3DaysBefore: boolean;
    notify1DayBefore: boolean;
    notifyAtDueTime: boolean;
    notifyOverdue: boolean;
  },
>(flags: T): T {
  const any =
    flags.notify7DaysBefore ||
    flags.notify3DaysBefore ||
    flags.notify1DayBefore ||
    flags.notifyAtDueTime ||
    flags.notifyOverdue;
  if (any) {
    // Product rule: send again if the reminder becomes overdue.
    return { ...flags, notifyOverdue: true };
  }
  return {
    ...flags,
    notifyAtDueTime: true,
    notifyOverdue: true,
  };
}

type PrefsClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{ data: { email_notifications_enabled?: boolean } | null; error: { message: string } | null }>;
      };
    };
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export async function getUserEmailNotificationsEnabled(sb: PrefsClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from("user_reminder_email_preferences")
      .select("email_notifications_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    // Missing table / schema cache lag → default to enabled (safe for delivery).
    if (error || !data) return true;
    return data.email_notifications_enabled !== false;
  } catch {
    return true;
  }
}

export async function upsertUserEmailNotificationsEnabled(
  sb: PrefsClient,
  userId: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await sb.from("user_reminder_email_preferences").upsert(
      {
        user_id: userId,
        email_notifications_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      const msg = error.message || "";
      if (/schema cache|does not exist|Could not find the table/i.test(msg)) {
        // Soft-ok until lifecycle migration is applied.
        return { ok: true };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/schema cache|does not exist|Could not find the table/i.test(msg)) {
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
}

/** Active for email = not completed, not archived, email_enabled. */
export function isReminderActiveForEmail(row: {
  is_completed?: boolean | null;
  is_archived?: boolean | null;
  email_enabled?: boolean | null;
}): boolean {
  if (row.is_completed) return false;
  if (row.is_archived) return false;
  if (row.email_enabled === false) return false;
  return true;
}
