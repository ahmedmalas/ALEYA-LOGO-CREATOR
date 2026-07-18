import { getProviderStatus } from "@/lib/providers";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "aleya-logo-creator",
    provider: getProviderStatus(),
    time: new Date().toISOString(),
  });
}
