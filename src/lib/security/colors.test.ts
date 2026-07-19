import { describe, expect, it } from "vitest";
import { isSafeHexColor, sanitizeColorList, sanitizeHexColor } from "./colors";

describe("hex color sanitization", () => {
  it("accepts strict hex", () => {
    expect(isSafeHexColor("#0F3D3E")).toBe(true);
    expect(isSafeHexColor("#abc")).toBe(true);
  });

  it("rejects injection payloads", () => {
    expect(isSafeHexColor('red"/><script>')).toBe(false);
    expect(isSafeHexColor("url(javascript:alert(1))")).toBe(false);
    expect(sanitizeHexColor("nope", "#111111")).toBe("#111111");
  });

  it("filters lists", () => {
    expect(sanitizeColorList(["#fff", "bad", "#112233", "also-bad"])).toEqual(["#fff", "#112233"]);
  });
});
