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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, schema);
    let conceptId = body.conceptId;

    if (body.brandKitId) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("id", body.brandKitId)
        .eq("owner_id", user.id)
        .single();
      if (!kit) return jsonError("Brand kit not found", 404);
      conceptId = kit.concept_id;
    }

    if (!conceptId) return jsonError("conceptId or brandKitId required", 400);

    const { data: concept } = await supabase
      .from("logo_concepts")
      .select("*")
      .eq("id", conceptId)
      .eq("owner_id", user.id)
      .single();
    if (!concept) return jsonError("Concept not found", 404);

    const zip = new JSZip();
    const files: Array<[string, string | null]> = [
      ["logo-transparent.png", concept.transparent_png_path],
      ["logo-hires.png", concept.png_path],
      ["logo-icon.png", concept.icon_path],
      ["logo-horizontal.png", concept.horizontal_path],
      ["logo-stacked.png", concept.stacked_path],
      ["logo-mono.png", concept.monochrome_path],
      ["preview-light.png", concept.light_preview_path],
      ["preview-dark.png", concept.dark_preview_path],
    ];

    if (concept.svg_markup) {
      zip.file("logo.svg", concept.svg_markup);
    }

    let assetCount = concept.svg_markup ? 1 : 0;
    for (const [name, path] of files) {
      if (!path) continue;
      const buf = await downloadFile(supabase, path);
      if (buf) {
        zip.file(name, buf);
        assetCount += 1;
      }
    }

    if (assetCount === 0) {
      return jsonError("No exportable assets found for this concept", 404);
    }

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
        },
        null,
        2,
      ),
    );

    const content = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(Buffer.from(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="aleya-logo-${conceptId.slice(0, 8)}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Export failed");
  }
}
