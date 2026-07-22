import { toast as sonnerToast, type ExternalToast } from "sonner";

/** Default durations — keep Sonner chrome unchanged; only timing/copy conventions. */
const DURATION = {
  success: 3200,
  error: 5200,
  info: 4000,
  loading: Infinity,
} as const;

type ToastOpts = ExternalToast & {
  /** Stable id prevents duplicate stacked toasts for the same action. */
  id?: string | number;
};

function withDefaults(kind: keyof typeof DURATION, opts?: ToastOpts): ExternalToast {
  return {
    duration: DURATION[kind],
    ...opts,
  };
}

/**
 * Thin Sonner wrapper: consistent durations + optional stable ids.
 * Does not change toast styling (ProductProviders Toaster owns theme/position).
 */
export const appToast = {
  success(message: string, opts?: ToastOpts) {
    return sonnerToast.success(message, withDefaults("success", opts));
  },
  error(message: string, opts?: ToastOpts) {
    return sonnerToast.error(message, withDefaults("error", opts));
  },
  info(message: string, opts?: ToastOpts) {
    return sonnerToast.message(message, withDefaults("info", opts));
  },
  loading(message: string, opts?: ToastOpts) {
    return sonnerToast.loading(message, withDefaults("loading", opts));
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
  /** Prefer for cloud sync / auto-save so repeats replace instead of stacking. */
  saveSuccess(message = "Saved.", id = "fn-save-success") {
    return sonnerToast.success(message, withDefaults("success", { id }));
  },
  saveError(message = "Could not save. Please try again.", id = "fn-save-error") {
    return sonnerToast.error(message, withDefaults("error", { id }));
  },
  networkError(message = "Network error. Check your connection and try again.", id = "fn-network-error") {
    return sonnerToast.error(message, withDefaults("error", { id }));
  },
  validation(message: string, id = "fn-validation") {
    return sonnerToast.error(message, withDefaults("error", { id, duration: 4200 }));
  },
};

export { sonnerToast as toast };
