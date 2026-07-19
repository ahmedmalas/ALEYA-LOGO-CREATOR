import { describe, expect, it } from "vitest";
import { getReferenceLimits } from "./limits";
import {
  sanitizeFilename,
  validateProjectCapacity,
  validateReferenceFile,
} from "./validate";

describe("reference validation", () => {
  const limits = getReferenceLimits("free");

  it("accepts supported image and pdf types under size limit", () => {
    expect(
      validateReferenceFile({ name: "logo.png", type: "image/png", size: 1024 }, limits),
    ).toBeNull();
    expect(
      validateReferenceFile({ name: "receipt.pdf", type: "application/pdf", size: 2048 }, limits),
    ).toBeNull();
  });

  it("rejects unsupported formats and oversized files", () => {
    expect(
      validateReferenceFile({ name: "x.gif", type: "image/gif", size: 100 }, limits)?.code,
    ).toBe("unsupported_type");
    expect(
      validateReferenceFile(
        { name: "big.png", type: "image/png", size: limits.maxFileBytes + 1 },
        limits,
      )?.code,
    ).toBe("file_too_large");
  });

  it("enforces per-project and total storage capacity", () => {
    expect(
      validateProjectCapacity({
        currentCount: limits.maxFilesPerProject,
        incomingCount: 1,
        currentTotalBytes: 0,
        incomingBytes: 10,
        limits,
      })?.code,
    ).toBe("too_many_files");
    expect(
      validateProjectCapacity({
        currentCount: 0,
        incomingCount: 1,
        currentTotalBytes: limits.maxTotalBytesPerUser,
        incomingBytes: 1,
        limits,
      })?.code,
    ).toBe("user_storage_exceeded");
  });

  it("sanitizes filenames and blocks path traversal segments", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("My Logo (final).PNG")).toMatch(/My-Logo/);
  });
});
