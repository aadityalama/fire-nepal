"use client";

import { appToast } from "@/lib/toast";
import { FORM_MESSAGES } from "@/lib/ux/form-messages";

/** Canonical finance Delete copy. */
export const DELETE_FEEDBACK = {
  deleting: FORM_MESSAGES.deleting,
  failed: FORM_MESSAGES.deleteFailed,
} as const;

export type RunDeleteActionOptions = {
  /** Toggle local Deleting… / disabled UI. */
  setDeleting?: (deleting: boolean) => void;
  /** Actual persistence work. Throw on failure. */
  action: () => Promise<void>;
  /** Override failure toast (default: "Delete failed"). */
  failureMessage?: string;
  /** Stable toast id to collapse duplicates. */
  toastId?: string;
  /** Skip failure toast when the caller already shows one. */
  silentFailure?: boolean;
};

/**
 * One delete path for finance confirm dialogs:
 * Deleting… → await cloud/local delete → success handled by caller | Delete failed.
 * Never uses fake timeouts; setDeleting(true) runs synchronously before awaiting.
 */
export async function runDeleteAction(options: RunDeleteActionOptions): Promise<boolean> {
  const {
    setDeleting,
    action,
    failureMessage = DELETE_FEEDBACK.failed,
    toastId = "finance-delete",
    silentFailure = false,
  } = options;

  setDeleting?.(true);
  try {
    await action();
    return true;
  } catch (error) {
    if (!silentFailure) {
      const detail = error instanceof Error && error.message.trim() ? error.message.trim() : null;
      appToast.error(detail && detail !== failureMessage ? `${failureMessage} (${detail})` : failureMessage, {
        id: `${toastId}-err`,
      });
    }
    return false;
  } finally {
    setDeleting?.(false);
  }
}
