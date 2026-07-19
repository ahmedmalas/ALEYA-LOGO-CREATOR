import { createHmac, timingSafeEqual } from "node:crypto";
import { isAllowedReturnUrl } from "@/lib/security/safe-path";

export const INTEGRATION_COOKIE = "aleya_integration_claims";

export type IntegrationClaims = {
  businessId: string;
  returnUrl: string;
  state: string;
  workspaceId: string;
  exp: number;
};

function secret() {
  const value = process.env.INTEGRATION_HMAC_SECRET;
  if (!value) throw new Error("INTEGRATION_HMAC_SECRET is not configured");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function encodeIntegrationClaims(claims: IntegrationClaims): string {
  const body = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeIntegrationClaims(token: string | undefined | null): IntegrationClaims | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as IntegrationClaims;
    if (!claims.businessId || !claims.returnUrl || !claims.state || !claims.exp) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (!isAllowedReturnUrl(claims.returnUrl, process.env.NEXT_PUBLIC_APP_URL)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function integrationCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(60, maxAgeSeconds),
  };
}
