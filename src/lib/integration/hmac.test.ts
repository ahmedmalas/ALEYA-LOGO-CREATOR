import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { signPayload, verifySignature } from "./hmac";

describe("integration hmac", () => {
  const previous = process.env.INTEGRATION_HMAC_SECRET;

  beforeAll(() => {
    process.env.INTEGRATION_HMAC_SECRET = "test-secret-value-for-hmac";
  });

  afterAll(() => {
    process.env.INTEGRATION_HMAC_SECRET = previous;
  });

  it("signs and verifies canonical payloads", () => {
    const payload = { business_id: "b1", exp: 123, state: "s1" };
    const sig = signPayload(payload);
    expect(verifySignature(payload, sig)).toBe(true);
    expect(verifySignature({ ...payload, state: "other" }, sig)).toBe(false);
  });
});
