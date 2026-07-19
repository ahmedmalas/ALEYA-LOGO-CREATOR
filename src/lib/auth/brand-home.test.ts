import { describe, expect, it } from "vitest";
import { brandHomePath } from "./brand-home";

describe("brandHomePath", () => {
  it("sends signed-in users to the dashboard", () => {
    expect(brandHomePath(true)).toBe("/dashboard");
  });

  it("sends signed-out users to the public homepage", () => {
    expect(brandHomePath(false)).toBe("/");
  });
});
