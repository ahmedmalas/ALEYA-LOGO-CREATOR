export type EmailActionKind = "signup" | "resend_confirmation" | "forgot_password";

const STORAGE_PREFIX = "aleya.auth.emailCooldown.";

/** Client-side cooldown between email-sending auth actions (seconds). */
export const EMAIL_ACTION_COOLDOWN_SECONDS: Record<EmailActionKind, number> = {
  signup: 60,
  resend_confirmation: 60,
  forgot_password: 60,
};

export function emailActionStorageKey(kind: EmailActionKind, email: string): string {
  return `${STORAGE_PREFIX}${kind}:${email.trim().toLowerCase()}`;
}

export function getCooldownRemainingMs(
  kind: EmailActionKind,
  email: string,
  now = Date.now(),
): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(emailActionStorageKey(kind, email));
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - now);
}

export function markEmailActionSent(kind: EmailActionKind, email: string, now = Date.now()): void {
  if (typeof window === "undefined") return;
  const seconds = EMAIL_ACTION_COOLDOWN_SECONDS[kind];
  window.localStorage.setItem(emailActionStorageKey(kind, email), String(now + seconds * 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function cooldownMessage(remainingSeconds: number): string {
  return `Please wait ${formatCountdown(remainingSeconds)} before requesting another email.`;
}

/** Maps Supabase / network auth email errors to user-facing copy. */
export function mapAuthEmailError(
  message: string | null | undefined,
  options?: { remainingSeconds?: number },
): string {
  const raw = (message ?? "").trim();
  const lower = raw.toLowerCase();
  const remaining = options?.remainingSeconds;

  if (
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("email rate limit exceeded") ||
    lower.includes("429")
  ) {
    if (typeof remaining === "number" && remaining > 0) {
      return `We're sending emails a bit carefully right now. ${cooldownMessage(remaining)}`;
    }
    return "We're sending emails a bit carefully right now. Please wait about a minute, then try again.";
  }

  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Sign in, or reset your password if you forgot it.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Could not reach authentication. Check your connection and try again.";
  }

  return raw || "Something went wrong. Please try again.";
}

export function isAuthEmailRateLimitError(message: string | null | undefined): boolean {
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("email rate limit exceeded")
  );
}
