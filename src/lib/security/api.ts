import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status: number, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
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
  if (error instanceof Error && (error as { status?: number }).status === 429) {
    return jsonError(error.message || "Rate limit exceeded", 429);
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
