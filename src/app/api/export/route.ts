import {
  assertExportAllowance,
  assertExportFormatsAllowed,
  PlanLimitError,
} from "@/lib/plans/enforce";
import { commitUsage, releaseUsage, reserveUsage } from "@/lib/plans/usage-accounting";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  conceptId: z.string().uuid().optional(),
  brandKitId: z.string().uuid().optional(),
});

async function downloadFile(supabase: Awaited<ReturnType<typeof createClient>>, path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("logo-assets").download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

const FORMAT_MAP: Array<{ file: string; format: string; pathKey: string }> = [
  { file: "logo.svg", format: "SVG", pathKey: "svg" },
  { file: "logo-transparent.png", format: "Transparent PNG", pathKey: "transparent_png_path" },
  { file: "logo-hires.png", format: "Hi-res PNG", pathKey: "png_path" },
  { file: "logo-icon.png", format: "Icon", pathKey: "icon_path" },
  { file: "logo-horizontal.png", format: "Horizontal", pathKey: "horizontal_path" },
  { file: "logo-stacked.png", format: "Stacked", pathKey: "stacked_path" },
  { file: "logo-mono.png", format: "Monochrome", pathKey: "monochrome_path" },
];

export async function POST(request: Request) {
  let reservationId: string | null = null;
  let ownerId: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);
    ownerId = user.id;

    const body = await readJson(request, schema);
    let conceptId = body.conceptId;
    let projectId: string | null = null;

    if (body.brandKitId) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("id", body.brandKitId)
        .eq("owner_id", user.id)
        .single();
      if (!kit) return jsonError("Brand kit not found", 404);
      conceptId = kit.concept_id;
      projectId = kit.project_id;
    }

    if (!conceptId) return jsonError("conceptId or brandKitId required", 400);

    const plan = await assertExportAllowance(supabase, user.id);
    reservationId = await reserveUsage({
      supabase,
      ownerId: user.id,
      eventType: "export",
      projectId,
      metadata: { conceptId, brandKitId: body.brandKitId ?? null },
    });

    const { data: concept } = await supabase
      .from("logo_concepts")
      .select("*")
      .eq("id", conceptId)
      .eq("owner_id", user.id)
      .single();
    if (!concept) {
      await releaseUsage({ supabase, reservationId, ownerId: user.id });
      return jsonError("Concept not found", 404);
    }
    projectId = projectId ?? concept.project_id;

    const zip = new JSZip();
    const includedFormats: string[] = [];

    if (concept.svg_markup) {
      assertExportFormatsAllowed(plan, ["SVG"]);
      zip.file("logo.svg", concept.svg_markup);
      includedFormats.push("SVG");
    }

    for (const item of FORMAT_MAP) {
      if (item.pathKey === "svg") continue;
      const path = concept[item.pathKey] as string | null;
      if (!path) continue;
      assertExportFormatsAllowed(plan, [item.format]);
      const buf = await downloadFile(supabase, path);
      if (buf) {
        zip.file(item.file, buf);
        includedFormats.push(item.format);
      }
    }

    // Optional previews are extras; not counted as plan formats.
    for (const [name, path] of [
      ["preview-light.png", concept.light_preview_path],
      ["preview-dark.png", concept.dark_preview_path],
    ] as const) {
      const buf = await downloadFile(supabase, path);
      if (buf) zip.file(name, buf);
    }

    if (includedFormats.length === 0) {
      await releaseUsage({ supabase, reservationId, ownerId: user.id });
      return jsonError("No exportable assets found for this concept", 404);
    }

    includedFormats.push("ZIP Brand Kit");
    assertExportFormatsAllowed(plan, ["ZIP Brand Kit"]);

    zip.file(
      "metadata.json",
      JSON.stringify(
        {
          title: concept.title,
          prompt: concept.prompt,
          iconConcept: concept.icon_concept,
          layout: concept.layout,
          palette: concept.palette,
          typography: concept.typography,
          provider: concept.provider,
          createdAt: concept.created_at,
          exportedFormats: includedFormats,
        },
        null,
        2,
      ),
    );

    const content = await zip.generateAsync({ type: "uint8array" });

    await commitUsage({
      supabase,
      reservationId,
      ownerId: user.id,
      eventType: "export",
      projectId,
      metadata: {
        conceptId,
        brandKitId: body.brandKitId ?? null,
        formats: includedFormats,
        pack: "zip",
      },
    });

    return new NextResponse(Buffer.from(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="aleya-logo-${conceptId.slice(0, 8)}.zip"`,
        "Cache-Control": "no-store",
        "X-ALEYA-Export-Formats": includedFormats.join(","),
      },
    });
  } catch (error) {
    if (supabase && reservationId && ownerId) {
      await releaseUsage({ supabase, reservationId, ownerId });
    }
    if (error instanceof PlanLimitError) {
      return jsonError(error.message, error.status);
    }
    return handleRouteError(error, "Export failed");
  }
}
