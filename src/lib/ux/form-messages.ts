/** Shared user-facing validation / feedback copy (no UI chrome). */

export const FORM_MESSAGES = {
  required: "Please fill in all required fields.",
  emailInvalid: "Enter a valid email address.",
  passwordTooShort: "Password must be at least 6 characters.",
  passwordsMismatch: "Passwords do not match. Please re-enter them.",
  network: "Network error. Check your connection and try again.",
  tryAgain: "Something went wrong. Please try again.",
  amountInvalid: "Enter a valid amount greater than zero.",
  amountRequired: "Enter an amount to continue.",
  paymentMethodRequired: "Choose a payment method to continue.",
  paymentProofRequired: "Upload a payment screenshot or receipt (JPG, PNG, or WebP).",
  sessionChecking: "Checking your session…",
  saving: "Saving…",
  deleting: "Deleting…",
  loading: "Loading…",
} as const;

export function focusFirstInvalid(form: HTMLFormElement | null): void {
  if (!form) return;
  const invalid = form.querySelector<HTMLElement>(
    "input:invalid, select:invalid, textarea:invalid, [aria-invalid='true']",
  );
  invalid?.focus({ preventScroll: false });
}
