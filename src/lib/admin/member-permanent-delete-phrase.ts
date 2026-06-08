/** Typed exactly by admins to confirm irreversible account removal (ban + archive + PII minimization). */
export const MEMBER_PERMANENT_DELETE_CONFIRMATION = "DELETE USER FOREVER" as const;

export const MEMBER_PERMANENT_DELETE_WARNING =
  "This action permanently removes user data and cannot be undone." as const;
