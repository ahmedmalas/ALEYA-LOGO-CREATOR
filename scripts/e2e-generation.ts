import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildAssetPack } from "../src/lib/logo/assets";
import { composeSvgConcepts } from "../src/lib/logo/svg-composer";
import type { LogoBrief } from "../src/types/logo";

async function main() {
const login = JSON.parse(readFileSync("/tmp/login.json", "utf8"));
const accessToken = login.access_token as string;
const userId = login.user.id as string;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});

const brief: LogoBrief = {
  businessName: "Northwind Craft",
  tagline: "Built with clarity",
  industry: "Design",
  personality: "refined",
  style: "elegant",
  preferredColors: ["#1F4D45", "#B08A4F"],
  avoidColors: ["#FF00FF"],
  iconIdeas: "geometric leaf monogram",
  typographyDirection: "modern-serif",
  layoutDirection: "icon-left",
};

const { data: workspace, error: wsError } = await supabase
  .from("workspaces")
  .insert({ owner_id: userId, name: "E2E Workspace" })
  .select("*")
  .single();
if (wsError) throw wsError;

const { data: project, error: projectError } = await supabase
  .from("logo_projects")
  .insert({
    workspace_id: workspace.id,
    owner_id: userId,
    business_name: brief.businessName,
    tagline: brief.tagline,
    industry: brief.industry,
    personality: brief.personality,
    style: brief.style,
    preferred_colors: brief.preferredColors,
    avoid_colors: brief.avoidColors,
    icon_ideas: brief.iconIdeas,
    typography_direction: brief.typographyDirection,
    layout_direction: brief.layoutDirection,
    status: "draft",
  })
  .select("*")
  .single();
if (projectError) throw projectError;

const concepts = composeSvgConcepts(brief, 4, "e2e-seed");
const saved = [];

for (const concept of concepts) {
  const pack = await buildAssetPack(concept.svgMarkup);
  const { data: row, error } = await supabase
    .from("logo_concepts")
    .insert({
      project_id: project.id,
      owner_id: userId,
      title: concept.title,
      prompt: concept.prompt,
      icon_concept: concept.iconConcept,
      layout: concept.layout,
      palette: concept.palette,
      typography: concept.typography,
      provider: concept.provider,
      provider_metadata: concept.providerMetadata,
      svg_markup: concept.svgMarkup,
    })
    .select("*")
    .single();
  if (error) throw error;

  const base = `${userId}/${project.id}/${row.id}`;
  const uploads: Array<[string, Buffer, string]> = [
    ["logo.svg", Buffer.from(pack.svg), "image/svg+xml"],
    ["logo-transparent.png", pack.transparentPng, "image/png"],
    ["logo-hires.png", pack.highResPng, "image/png"],
    ["logo-icon.png", pack.iconPng, "image/png"],
    ["logo-horizontal.png", pack.horizontalPng, "image/png"],
    ["logo-stacked.png", pack.stackedPng, "image/png"],
    ["logo-mono.png", pack.monochromePng, "image/png"],
    ["preview-light.png", pack.lightPreviewPng, "image/png"],
    ["preview-dark.png", pack.darkPreviewPng, "image/png"],
  ];

  for (const [name, data, type] of uploads) {
    const path = `${base}/${name}`;
    const { error: upErr } = await supabase.storage.from("logo-assets").upload(path, data, {
      contentType: type,
      upsert: true,
    });
    if (upErr) throw upErr;
  }

  const { data: updated, error: upError } = await supabase
    .from("logo_concepts")
    .update({
      png_path: `${base}/logo-hires.png`,
      transparent_png_path: `${base}/logo-transparent.png`,
      monochrome_path: `${base}/logo-mono.png`,
      icon_path: `${base}/logo-icon.png`,
      horizontal_path: `${base}/logo-horizontal.png`,
      stacked_path: `${base}/logo-stacked.png`,
      light_preview_path: `${base}/preview-light.png`,
      dark_preview_path: `${base}/preview-dark.png`,
      is_selected: saved.length === 0,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (upError) throw upError;
  saved.push(updated);

  if (saved.length === 1) {
    mkdirSync("/opt/cursor/artifacts/logo-e2e", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/logo-e2e/sample-logo.svg", concept.svgMarkup);
    writeFileSync("/opt/cursor/artifacts/logo-e2e/sample-logo.png", pack.transparentPng);
  }
}

const selected = saved[0]!;
await supabase
  .from("logo_projects")
  .update({ selected_concept_id: selected.id, status: "selected" })
  .eq("id", project.id);

const { data: brandKit, error: kitError } = await supabase
  .from("brand_kits")
  .insert({
    workspace_id: workspace.id,
    owner_id: userId,
    project_id: project.id,
    concept_id: selected.id,
    name: `${brief.businessName} Brand Kit`,
    business_name: brief.businessName,
    tagline: brief.tagline,
    primary_colors: [selected.palette.primary, selected.palette.accent],
    secondary_colors: [selected.palette.secondary],
    typography: selected.typography,
    logo_prompt: selected.prompt,
    icon_concept: selected.icon_concept,
    layout: selected.layout,
    primary_logo_path: selected.transparent_png_path,
    secondary_logo_path: selected.horizontal_path,
    icon_path: selected.icon_path,
    light_variant_path: selected.light_preview_path,
    dark_variant_path: selected.dark_preview_path,
    generation_history: saved.map((c) => ({ id: c.id, title: c.title, prompt: c.prompt })),
    editable_metadata: {
      businessName: brief.businessName,
      tagline: brief.tagline,
      colourPalette: selected.palette,
      typographyChoices: selected.typography,
      logoPrompt: selected.prompt,
      iconConcept: selected.icon_concept,
      layout: selected.layout,
    },
  })
  .select("*")
  .single();
if (kitError) throw kitError;

const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const { data: leaked } = await anonClient.from("logo_projects").select("id").eq("id", project.id);
if (leaked && leaked.length > 0) {
  throw new Error("Workspace isolation failed: anon could read project");
}

const { data: reopened } = await supabase
  .from("brand_kits")
  .select("*")
  .eq("id", brandKit.id)
  .single();

const result = {
  ok: true,
  userId,
  projectId: project.id,
  conceptCount: saved.length,
  brandKitId: brandKit.id,
  reopenedName: reopened?.name,
  samplePrompt: selected.prompt,
  assets: {
    svg: Boolean(selected.svg_markup?.includes("<svg")),
    transparent: selected.transparent_png_path,
    hires: selected.png_path,
    icon: selected.icon_path,
  },
  provider: "svg-composer",
  openaiConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY),
  requiredCredentialForAiRaster: "OPENAI_API_KEY (preferred) or AI_GATEWAY_API_KEY",
  artifactSvg: "/opt/cursor/artifacts/logo-e2e/sample-logo.svg",
  artifactPng: "/opt/cursor/artifacts/logo-e2e/sample-logo.png",
};

mkdirSync("/opt/cursor/artifacts/logo-e2e", { recursive: true });
writeFileSync("/opt/cursor/artifacts/logo-e2e/e2e-result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
