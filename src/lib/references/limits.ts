import type { PlanId } from "@/lib/pricing";

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

const FREE_LIMITS: ReferenceLimits = {
  planId: "free",
  maxFilesPerProject: Number(process.env.REFERENCE_MAX_FILES_PER_PROJECT ?? 10),
  maxFileBytes: Number(process.env.REFERENCE_MAX_FILE_BYTES ?? 5 * 1024 * 1024),
  maxTotalBytesPerUser: Number(process.env.REFERENCE_MAX_TOTAL_BYTES_PER_USER ?? 50 * 1024 * 1024),
  allowedMimeTypes: REFERENCE_ALLOWED_MIME_TYPES,
};

/** Pro limits stay higher once billing ships; enforced server-side today for consistency. */
const PRO_LIMITS: ReferenceLimits = {
  planId: "pro",
  maxFilesPerProject: Number(process.env.REFERENCE_PRO_MAX_FILES_PER_PROJECT ?? 40),
  maxFileBytes: Number(process.env.REFERENCE_PRO_MAX_FILE_BYTES ?? 10 * 1024 * 1024),
  maxTotalBytesPerUser: Number(process.env.REFERENCE_PRO_MAX_TOTAL_BYTES_PER_USER ?? 250 * 1024 * 1024),
  allowedMimeTypes: REFERENCE_ALLOWED_MIME_TYPES,
};

/** v1 accounts are Free until Pro billing exists. */
export function getReferenceLimits(planId: PlanId = "free"): ReferenceLimits {
  return planId === "pro" ? { ...PRO_LIMITS } : { ...FREE_LIMITS };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAllowedReferenceMime(mime: string): mime is ReferenceMimeType {
  return (REFERENCE_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export const REFERENCE_HELP_TEXT =
  "Upload your current logo, packaging, sketches, receipts, screenshots, or inspiration images. ALEYA will use these as visual references for your project.";
