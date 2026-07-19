import {
  INTEGRATION_COOKIE,
  encodeIntegrationClaims,
  integrationCookieOptions,
} from "@/lib/integration/claims";
import { verifySignature } from "@/lib/integration/hmac";
import { handleRouteError, jsonError } from "@/lib/security/api";
import { isAllowedReturnUrl } from "@/lib/security/safe-path";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  return_url: z.string().url(),
  business_id: z.string().min(1).max(120),
  workspace_id: z.string().min(1).max(120),
  state: z.string().min(1).max(200),
  exp: z.coerce.number(),
  sig: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (body.exp < Math.floor(Date.now() / 1000)) {
      return jsonError("Integration link expired", 401);
    }
    if (!isAllowedReturnUrl(body.return_url, process.env.NEXT_PUBLIC_APP_URL)) {
      return jsonError("Return URL is not allowed", 400);
    }
    const { sig, ...unsigned } = body;
    const ok = verifySignature(unsigned, sig);
    if (!ok) {
      return jsonError("Invalid integration signature", 401);
    }

    const token = encodeIntegrationClaims({
      businessId: body.business_id,
      returnUrl: body.return_url,
      state: body.state,
      workspaceId: body.workspace_id,
      exp: body.exp,
    });
    const maxAge = Math.max(60, body.exp - Math.floor(Date.now() / 1000));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(INTEGRATION_COOKIE, token, integrationCookieOptions(maxAge));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("INTEGRATION_HMAC_SECRET")) {
      return jsonError("INTEGRATION_HMAC_SECRET is not configured on Logo Creator", 503);
    }
    return handleRouteError(error, "Invalid request");
  }
}
