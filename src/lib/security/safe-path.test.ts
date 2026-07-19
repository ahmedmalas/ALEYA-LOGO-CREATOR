import { describe, expect, it } from "vitest";
import { isAllowedReturnUrl, safeInternalPath } from "./safe-path";

describe("safeInternalPath", () => {
  it("allows relative app paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/projects/abc?x=1")).toBe("/projects/abc?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com")).toBe("/dashboard");
    expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
    expect(safeInternalPath("/../admin")).toBe("/dashboard");
    expect(safeInternalPath(null)).toBe("/dashboard");
  });
});

describe("isAllowedReturnUrl", () => {
  it("allows configured origins", () => {
    process.env.ALEYA_INVOICING_RECEIVE_URL = "https://invoicing.example/api/receive";
    expect(isAllowedReturnUrl("https://invoicing.example/businesses/1")).toBe(true);
    expect(isAllowedReturnUrl("https://evil.com/phish")).toBe(false);
  });
});
