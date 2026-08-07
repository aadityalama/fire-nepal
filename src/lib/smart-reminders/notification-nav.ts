import type { InAppNotification, InAppNotificationKind } from "./types";

/**
 * Destination for an in-app smart-reminder notification.
 * Deep-links to the matching reminder when possible.
 */
export function getInAppNotificationHref(notification: Pick<InAppNotification, "kind" | "reminderId">): string {
  const { kind, reminderId } = notification;

  if (kind === "family_shared") {
    return "/family";
  }

  if (reminderId) {
    return `/smart-reminders?reminder=${encodeURIComponent(reminderId)}`;
  }

  return defaultHrefForKind(kind);
}

function defaultHrefForKind(kind: InAppNotificationKind): string {
  switch (kind) {
    case "family_shared":
      return "/family";
    case "payment_due":
    case "overdue":
    case "email_sent":
    default:
      return "/smart-reminders";
  }
}
