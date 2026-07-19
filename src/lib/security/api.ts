import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status: number, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(
  body: T,
  init?: { status?: number },
) {
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const error = new Error("Unauthorized");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return { supabase, user };
}

export function handleRouteError(error: unknown, fallback = "Request failed") {
  if (error instanceof ZodError) {
    return jsonError("Invalid request", 400, {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const status = error instanceof Error ? (error as { status?: number }).status : undefined;
  if (status === 401) return jsonError("Unauthorized", 401);
  if (status === 404) return jsonError(error instanceof Error ? error.message : "Not found", 404);
  if (status === 400) return jsonError(error instanceof Error ? error.message : "Bad request", 400);
  if (status === 429) {
    return jsonError(
      error instanceof Error ? error.message || "Rate limit exceeded" : "Rate limit exceeded",
      429,
    );
  }
  if (status === 402 || status === 403 || status === 503) {
    return jsonError(error instanceof Error ? error.message : fallback, status);
  }
  console.error("[api]", error);
  return jsonError(fallback, 500);
}

export async function readJson<T>(request: Request, schema: { parse: (data: unknown) => T }): Promise<T> {
  const raw = await request.json().catch(() => {
    throw new ZodError([
      {
        code: "custom",
        path: [],
        message: "Request body must be JSON",
      },
    ]);
  });
  return schema.parse(raw);
}
