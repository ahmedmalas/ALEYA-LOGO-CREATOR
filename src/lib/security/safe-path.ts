/**
 * Allow only same-origin relative paths for post-auth redirects.
 * Rejects protocol-relative URLs, absolute URLs, and path traversal.
 */
export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  if (trimmed.includes("..")) return fallback;
  return trimmed;
}

/** Allow return URLs only to configured Aleya origins (or same-origin). */
export function isAllowedReturnUrl(returnUrl: string, appOrigin?: string): boolean {
  try {
    const url = new URL(returnUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const allowed = new Set<string>();
    if (appOrigin) {
      try {
        allowed.add(new URL(appOrigin).origin);
      } catch {
        /* ignore */
      }
    }
    const receive = process.env.ALEYA_INVOICING_RECEIVE_URL;
    if (receive) {
      try {
        allowed.add(new URL(receive).origin);
      } catch {
        /* ignore */
      }
    }
    const extra = process.env.ALEYA_RETURN_URL_ALLOWLIST ?? "";
    for (const part of extra.split(",")) {
      const origin = part.trim();
      if (!origin) continue;
      try {
        allowed.add(new URL(origin).origin);
      } catch {
        /* ignore */
      }
    }
    if (allowed.size === 0) return false;
    return allowed.has(url.origin);
  } catch {
    return false;
  }
}
