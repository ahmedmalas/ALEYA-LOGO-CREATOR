import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAssetPack, pathFor } from "@/lib/logo/assets";
import { getImageProvider, ProviderError } from "@/lib/providers";
import { assertGenerationRateLimit } from "@/lib/rate-limit";
import type { GeneratedConcept, LogoBrief } from "@/types/logo";

async function upload(
  supabase: SupabaseClient,
  path: string,
  data: Buffer | string,
  contentType: string,
) {
  const body = typeof data === "string" ? Buffer.from(data) : data;
  const { error } = await supabase.storage.from("logo-assets").upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

async function persistConceptAssets(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string,
  conceptId: string,
  concept: GeneratedConcept,
) {
  const pack = await buildAssetPack(concept.svgMarkup, concept.pngBuffer);
  const base = (name: string) => pathFor(ownerId, projectId, conceptId, name);

  const [
    png_path,
    transparent_png_path,
    monochrome_path,
    icon_path,
    horizontal_path,
    stacked_path,
    light_preview_path,
    dark_preview_path,
  ] = await Promise.all([
    upload(supabase, base("logo-hires.png"), pack.highResPng, "image/png"),
    upload(supabase, base("logo-transparent.png"), pack.transparentPng, "image/png"),
    upload(supabase, base("logo-mono.png"), pack.monochromePng, "image/png"),
    upload(supabase, base("logo-icon.png"), pack.iconPng, "image/png"),
    upload(supabase, base("logo-horizontal.png"), pack.horizontalPng, "image/png"),
    upload(supabase, base("logo-stacked.png"), pack.stackedPng, "image/png"),
    upload(supabase, base("preview-light.png"), pack.lightPreviewPng, "image/png"),
    upload(supabase, base("preview-dark.png"), pack.darkPreviewPng, "image/png"),
  ]);

  await upload(supabase, base("logo.svg"), pack.svg, "image/svg+xml");
  await upload(supabase, base("logo-mono.svg"), pack.monochromeSvg, "image/svg+xml");

  return {
    svg_markup: concept.svgMarkup,
    png_path,
    transparent_png_path,
    monochrome_path,
    icon_path,
    horizontal_path,
    stacked_path,
    light_preview_path,
    dark_preview_path,
  };
}

export async function runGenerationJob(input: {
  supabase: SupabaseClient;
  ownerId: string;
  projectId: string;
  brief: LogoBrief;
  kind: "generate" | "regenerate" | "refine";
  idempotencyKey: string;
  count?: number;
  conceptId?: string;
  instruction?: string;
}) {
  const { supabase, ownerId, projectId, brief, kind, idempotencyKey } = input;

  const { data: existing } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing?.status === "succeeded") {
    return { job: existing, reused: true as const };
  }
  if (existing?.status === "running" || existing?.status === "queued") {
    return { job: existing, reused: true as const };
  }

  await assertGenerationRateLimit(supabase, ownerId);

  const provider = getImageProvider();
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      idempotency_key: idempotencyKey,
      kind,
      provider: provider.name,
      status: "running",
      request_payload: {
        brief,
        count: input.count ?? 4,
        conceptId: input.conceptId,
        instruction: input.instruction,
      },
    })
    .select("*")
    .single();

  if (jobError) {
    if (jobError.code === "23505") {
      const { data: raced } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("idempotency_key", idempotencyKey)
        .single();
      return { job: raced, reused: true as const };
    }
    throw new Error(jobError.message);
  }

  try {
    await supabase.from("logo_projects").update({ status: "generating" }).eq("id", projectId);

    let concepts: GeneratedConcept[] = [];
    if (kind === "refine") {
      if (!input.conceptId || !input.instruction) {
        throw new ProviderError("invalid_request", "conceptId and instruction are required to refine");
      }
      const { data: parent, error } = await supabase
        .from("logo_concepts")
        .select("*")
        .eq("id", input.conceptId)
        .eq("owner_id", ownerId)
        .single();
      if (error || !parent) throw new Error("Concept not found");
      const parentConcept: GeneratedConcept = {
        title: parent.title,
        prompt: parent.prompt,
        iconConcept: parent.icon_concept ?? "",
        layout: parent.layout,
        palette: parent.palette,
        typography: parent.typography,
        svgMarkup: parent.svg_markup ?? "",
        provider: parent.provider,
        providerMetadata: parent.provider_metadata ?? {},
      };
      concepts = [await provider.refineConcept({ brief, concept: parentConcept, instruction: input.instruction })];
    } else {
      concepts = await provider.generateConcepts({
        brief,
        count: input.count ?? 4,
        seed: idempotencyKey,
      });
    }

    const saved = [];
    const referenceIds = (brief.references ?? []).map((r) => r.id);
    for (const concept of concepts) {
      const { data: row, error } = await supabase
        .from("logo_concepts")
        .insert({
          project_id: projectId,
          owner_id: ownerId,
          job_id: job.id,
          title: concept.title,
          prompt: concept.prompt,
          icon_concept: concept.iconConcept,
          layout: concept.layout,
          palette: concept.palette,
          typography: concept.typography,
          provider: concept.provider,
          provider_metadata: {
            ...concept.providerMetadata,
            // Do not persist large base64 blobs in DB
            imageBase64: undefined,
            referenceIds,
            referenceFilenames: (brief.references ?? []).map((r) => r.filename),
            referenceTitles: (brief.references ?? []).map((r) => r.filename),
          },
          svg_markup: concept.svgMarkup,
          parent_concept_id: kind === "refine" ? input.conceptId : null,
          refinement_instruction: input.instruction ?? null,
        })
        .select("*")
        .single();
      if (error || !row) throw new Error(error?.message ?? "Failed to save concept");

      const assets = await persistConceptAssets(supabase, ownerId, projectId, row.id, concept);
      const { data: updated, error: updateError } = await supabase
        .from("logo_concepts")
        .update(assets)
        .eq("id", row.id)
        .select("*")
        .single();
      if (updateError) throw new Error(updateError.message);
      saved.push(updated);

      if (referenceIds.length) {
        await supabase.from("generation_references").insert(
          referenceIds.map((referenceId) => ({
            generation_job_id: job.id,
            concept_id: row.id,
            reference_id: referenceId,
            owner_id: ownerId,
          })),
        );
      }
    }

    const { data: finished } = await supabase
      .from("generation_jobs")
      .update({
        status: "succeeded",
        result_payload: {
          conceptIds: saved.map((c) => c.id),
          referenceIds,
        },
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    await supabase.from("usage_events").insert({
      owner_id: ownerId,
      event_type: kind === "refine" ? "refinement" : "generation",
      project_id: projectId,
      metadata: { jobId: job.id, referenceIds, conceptIds: saved.map((c) => c.id) },
    });

    await supabase.from("logo_projects").update({ status: "ready" }).eq("id", projectId);

    return { job: finished, concepts: saved, reused: false as const };
  } catch (error) {
    const message =
      error instanceof ProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Generation failed";
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    await supabase.from("logo_projects").update({ status: "draft" }).eq("id", projectId);
    throw error;
  }
}

export async function selectConceptAndCreateBrandKit(input: {
  supabase: SupabaseClient;
  ownerId: string;
  projectId: string;
  conceptId: string;
}) {
  const { supabase, ownerId, projectId, conceptId } = input;

  const { data: project } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .single();
  if (!project) throw new Error("Project not found");

  const { data: concept } = await supabase
    .from("logo_concepts")
    .select("*")
    .eq("id", conceptId)
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .single();
  if (!concept) throw new Error("Concept not found");

  await supabase.from("logo_concepts").update({ is_selected: false }).eq("project_id", projectId);
  await supabase.from("logo_concepts").update({ is_selected: true }).eq("id", conceptId);
  await supabase
    .from("logo_projects")
    .update({ selected_concept_id: conceptId, status: "selected" })
    .eq("id", projectId);

  const { data: history } = await supabase
    .from("logo_concepts")
    .select("id, title, prompt, created_at, provider, refinement_instruction")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const palette = concept.palette as { primary?: string; secondary?: string; accent?: string };
  const { data: brandKit, error } = await supabase
    .from("brand_kits")
    .insert({
      workspace_id: project.workspace_id,
      owner_id: ownerId,
      project_id: projectId,
      concept_id: conceptId,
      name: `${project.business_name} Brand Kit`,
      business_name: project.business_name,
      tagline: project.tagline,
      primary_colors: [palette.primary, palette.accent].filter(Boolean),
      secondary_colors: [palette.secondary].filter(Boolean),
      typography: concept.typography,
      logo_prompt: concept.prompt,
      icon_concept: concept.icon_concept,
      layout: concept.layout,
      primary_logo_path: concept.transparent_png_path ?? concept.png_path,
      secondary_logo_path: concept.horizontal_path,
      icon_path: concept.icon_path,
      light_variant_path: concept.light_preview_path,
      dark_variant_path: concept.dark_preview_path,
      generation_history: history ?? [],
      editable_metadata: {
        businessName: project.business_name,
        tagline: project.tagline,
        colourPalette: concept.palette,
        typographyChoices: concept.typography,
        logoPrompt: concept.prompt,
        iconConcept: concept.icon_concept,
        layout: concept.layout,
        style: project.style,
        personality: project.personality,
        preferredColors: project.preferred_colors,
        avoidColors: project.avoid_colors,
      },
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return brandKit;
}
