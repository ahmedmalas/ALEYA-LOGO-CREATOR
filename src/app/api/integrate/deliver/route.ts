import {
  INTEGRATION_COOKIE,
  decodeIntegrationClaims,
} from "@/lib/integration/claims";
import { signPayload } from "@/lib/integration/hmac";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { isAllowedReturnUrl } from "@/lib/security/safe-path";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  brandKitId: z.string().uuid(),
  state: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, schema);
    const { data: kit } = await supabase
      .from("brand_kits")
      .select("*, logo_projects(aleya_business_id, aleya_return_url)")
      .eq("id", body.brandKitId)
      .eq("owner_id", user.id)
      .single();

    if (!kit) return jsonError("Brand kit not found", 404);

    const project = kit.logo_projects as {
      aleya_business_id?: string | null;
      aleya_return_url?: string | null;
    } | null;

    const cookieStore = await cookies();
    const claims = decodeIntegrationClaims(cookieStore.get(INTEGRATION_COOKIE)?.value);
    const businessId = project?.aleya_business_id;
    const receiveUrl = process.env.ALEYA_INVOICING_RECEIVE_URL;

    if (!businessId || !receiveUrl) {
      return NextResponse.json({
        delivered: false,
        reason: "No Aleya business link or ALEYA_INVOICING_RECEIVE_URL configured",
        brandKitId: kit.id,
      });
    }

    if (claims && claims.businessId !== businessId) {
      return jsonError("Brand Kit is not bound to the verified Aleya handoff", 403);
    }

    const rawReturn = project?.aleya_return_url ?? claims?.returnUrl ?? null;
    const returnUrl =
      rawReturn && isAllowedReturnUrl(rawReturn, process.env.NEXT_PUBLIC_APP_URL)
        ? rawReturn
        : null;

    async function signedUrl(path: string | null) {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("logo-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (error) return null;
      return data?.signedUrl ?? null;
    }

    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    const state = body.state ?? claims?.state ?? crypto.randomUUID();
    const unsigned = {
      state,
      businessId,
      brandKitId: kit.id,
      primaryLogoUrl: await signedUrl(kit.primary_logo_path),
      iconUrl: await signedUrl(kit.icon_path),
      horizontalLogoUrl: await signedUrl(kit.secondary_logo_path),
      lightVariantUrl: await signedUrl(kit.light_variant_path),
      darkVariantUrl: await signedUrl(kit.dark_variant_path),
      palette: {
        primary: kit.primary_colors?.[0] ?? "#0F3D3E",
        secondary: kit.secondary_colors?.[0] ?? "#C4A574",
        accent: kit.primary_colors?.[1] ?? "#1A1A1A",
      },
      typography: kit.typography,
      metadata: {
        businessName: kit.business_name,
        tagline: kit.tagline,
        source: "aleya-logo-creator",
      },
      exp,
    };

    const payload = { ...unsigned, sig: signPayload(unsigned) };

    const { data: delivery } = await supabase
      .from("integration_deliveries")
      .insert({
        owner_id: user.id,
        brand_kit_id: kit.id,
        aleya_business_id: businessId,
        state,
        payload,
        status: "pending",
      })
      .select("*")
      .single();

    try {
      const response = await fetch(receiveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.text();
      await supabase
        .from("integration_deliveries")
        .update({
          status: response.ok ? "delivered" : "failed",
          response_body: responseBody.slice(0, 2000),
          delivered_at: response.ok ? new Date().toISOString() : null,
        })
        .eq("id", delivery!.id);

      return NextResponse.json({
        delivered: response.ok,
        status: response.status,
        returnUrl,
        deliveryId: delivery?.id,
      });
    } catch (error) {
      await supabase
        .from("integration_deliveries")
        .update({
          status: "failed",
          response_body: error instanceof Error ? error.message : "deliver failed",
        })
        .eq("id", delivery!.id);
      return jsonError("Could not reach Aleya Invoicing", 502);
    }
  } catch (error) {
    return handleRouteError(error, "Delivery failed");
  }
}
