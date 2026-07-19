import {
  formatBytes,
  getReferenceLimits,
  isAllowedReferenceMime,
  type ReferenceLimits,
} from "@/lib/references/limits";

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return cleaned || "file";
}

export function assertSafeStorageSegments(...segments: string[]) {
  for (const segment of segments) {
    if (!segment || segment.includes("..") || segment.includes("/") || segment.includes("\\")) {
      throw new Error("Invalid storage path segment");
    }
  }
}

export function referenceStoragePath(
  ownerId: string,
  projectId: string,
  referenceId: string,
  safeFilename: string,
): string {
  assertSafeStorageSegments(ownerId, projectId, referenceId, safeFilename);
  return `${ownerId}/${projectId}/${referenceId}/${safeFilename}`;
}

export type FileValidationError = { code: string; message: string };

export function validateReferenceFile(
  file: { name: string; type: string; size: number },
  limits: ReferenceLimits = getReferenceLimits(),
): FileValidationError | null {
  if (!file.name?.trim()) {
    return { code: "filename_required", message: "Each file needs a name." };
  }
  if (!isAllowedReferenceMime(file.type)) {
    return {
      code: "unsupported_type",
      message: `Unsupported format “${file.type || "unknown"}”. Allowed: PNG, JPG, WEBP, SVG, PDF.`,
    };
  }
  if (file.size <= 0) {
    return { code: "empty_file", message: "File is empty." };
  }
  if (file.size > limits.maxFileBytes) {
    return {
      code: "file_too_large",
      message: `“${file.name}” is ${formatBytes(file.size)}. Maximum per file is ${formatBytes(limits.maxFileBytes)}.`,
    };
  }
  return null;
}

export function validateProjectCapacity(input: {
  currentCount: number;
  incomingCount: number;
  currentTotalBytes: number;
  incomingBytes: number;
  limits?: ReferenceLimits;
}): FileValidationError | null {
  const limits = input.limits ?? getReferenceLimits();
  if (input.currentCount + input.incomingCount > limits.maxFilesPerProject) {
    return {
      code: "too_many_files",
      message: `This project allows up to ${limits.maxFilesPerProject} reference files.`,
    };
  }
  if (input.currentTotalBytes + input.incomingBytes > limits.maxTotalBytesPerUser) {
    return {
      code: "user_storage_exceeded",
      message: `Reference storage limit is ${formatBytes(limits.maxTotalBytesPerUser)} for your plan.`,
    };
  }
  return null;
}
