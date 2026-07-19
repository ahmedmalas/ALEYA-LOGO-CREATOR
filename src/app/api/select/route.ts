import { selectConceptAndCreateBrandKit } from "@/lib/logo/generation-service";
import { PlanLimitError } from "@/lib/plans/enforce";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().uuid(),
  conceptId: z.string().uuid(),
  deliverToAleya: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const brandKit = await selectConceptAndCreateBrandKit({
      supabase,
      ownerId: user.id,
      projectId: body.projectId,
      conceptId: body.conceptId,
    });

    let delivery = null;
    if (body.deliverToAleya) {
      const res = await fetch(new URL("/api/integrate/deliver", request.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ brandKitId: brandKit.id }),
      });
      delivery = await res.json();
    }

    return NextResponse.json({ brandKit, delivery });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Selection failed" },
      { status: 400 },
    );
  }
}
