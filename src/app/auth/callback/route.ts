import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/security/safe-path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fail = new URL("/login", request.url);
      fail.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(fail);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
