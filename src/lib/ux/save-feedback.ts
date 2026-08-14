"use client";

import { appToast } from "@/lib/toast";
import { FORM_MESSAGES } from "@/lib/ux/form-messages";

/** Canonical finance Save copy. */
export const SAVE_FEEDBACK = {
  saving: FORM_MESSAGES.saving,
  saved: FORM_MESSAGES.saved,
  failed: FORM_MESSAGES.saveFailed,
} as const;

export type RunSaveActionOptions = {
  /** Toggle local Saving… / disabled UI. */
  setSaving?: (saving: boolean) => void;
  /** Actual persistence work. Throw on failure. */
  action: () => Promise<void>;
  /** Override success toast (default: "Saved"). */
  successMessage?: string;
  /** Override failure toast (default: "Save failed — please try again"). */
  failureMessage?: string;
  /** Stable toast id to collapse duplicates. */
  toastId?: string;
  /** Skip success toast when the caller already shows one. */
  silentSuccess?: boolean;
  /** Skip failure toast when the caller already shows one. */
  silentFailure?: boolean;
};

/**
 * One submit path for finance forms:
 * Saving… → await cloud/local write → Saved | Save failed.
 * Never swallows persistence errors; leaves form data intact on failure.
 */
export async function runSaveAction(options: RunSaveActionOptions): Promise<boolean> {
  const {
    setSaving,
    action,
    successMessage = SAVE_FEEDBACK.saved,
    failureMessage = SAVE_FEEDBACK.failed,
    toastId = "finance-save",
    silentSuccess = false,
    silentFailure = false,
  } = options;

  setSaving?.(true);
  try {
    await action();
    if (!silentSuccess) {
      appToast.success(successMessage, { id: `${toastId}-ok` });
    }
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
    setSaving?.(false);
  }
}
