import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.INTEGRATION_HMAC_SECRET;
  if (!value) {
    throw new Error("INTEGRATION_HMAC_SECRET is not configured");
  }
  return value;
}

export function signPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHmac("sha256", secret()).update(canonical).digest("hex");
}

export function verifySignature(payload: Record<string, unknown>, signature: string): boolean {
  const expected = signPayload(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildLaunchUrl(input: {
  logoCreatorUrl: string;
  returnUrl: string;
  businessId: string;
  workspaceId: string;
  state: string;
  exp: number;
}): string {
  const unsigned = {
    return_url: input.returnUrl,
    business_id: input.businessId,
    workspace_id: input.workspaceId,
    state: input.state,
    exp: input.exp,
  };
  const sig = signPayload(unsigned);
  const url = new URL("/integrate", input.logoCreatorUrl);
  for (const [key, value] of Object.entries({ ...unsigned, sig })) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
