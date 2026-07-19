import { formatBytesLabel, getPlan, type PlanId } from "@/lib/plans/catalog";

export const REFERENCE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
] as const;

export type ReferenceMimeType = (typeof REFERENCE_ALLOWED_MIME_TYPES)[number];

export type ReferenceLimits = {
  planId: PlanId;
  maxFilesPerProject: number;
  maxFileBytes: number;
  maxTotalBytesPerUser: number;
  allowedMimeTypes: readonly string[];
};

export function getReferenceLimits(planId: PlanId = "free"): ReferenceLimits {
  const plan = getPlan(planId);
  return {
    planId: plan.id,
    maxFilesPerProject: plan.referenceMaxFilesPerProject,
    maxFileBytes: plan.referenceMaxFileBytes,
    maxTotalBytesPerUser: plan.referenceMaxTotalBytes,
    allowedMimeTypes: REFERENCE_ALLOWED_MIME_TYPES,
  };
}

export function formatBytes(bytes: number): string {
  return formatBytesLabel(bytes);
}

export function isAllowedReferenceMime(mime: string): mime is ReferenceMimeType {
  return (REFERENCE_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export const REFERENCE_HELP_TEXT =
  "Upload real files — current logos, packaging photos, sketches, receipts, screenshots, or inspiration images (PNG, JPG, WEBP, SVG, PDF). Optional notes help ALEYA interpret each file; notes alone are not enough.";
