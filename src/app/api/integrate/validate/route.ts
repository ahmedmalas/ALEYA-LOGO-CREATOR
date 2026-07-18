import { verifySignature } from "@/lib/integration/hmac";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  return_url: z.string().url(),
  business_id: z.string().min(1),
  workspace_id: z.string().min(1),
  state: z.string().min(1),
  exp: z.coerce.number(),
  sig: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (body.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Integration link expired" }, { status: 401 });
    }
    const { sig, ...unsigned } = body;
    const ok = verifySignature(unsigned, sig);
    if (!ok) {
      return NextResponse.json({ error: "Invalid integration signature" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("INTEGRATION_HMAC_SECRET")
            ? "INTEGRATION_HMAC_SECRET is not configured on Logo Creator"
            : error instanceof Error
              ? error.message
              : "Invalid request",
      },
      { status: 400 },
    );
  }
}
