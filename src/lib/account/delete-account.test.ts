import { describe, expect, it } from "vitest";
import { deactivateAccount } from "./delete-account";

function makeClient() {
  const eqResult = {
    eq: () => eqResult,
    then: undefined,
  };
  return {
    from: () => ({
      update: () => ({
        eq: () => eqResult,
      }),
    }),
    auth: {
      signOut: async () => ({ error: null }),
    },
  } as never;
}

describe("account deactivation", () => {
  it("returns deactivate mode with remains-stored disclosure", async () => {
    const result = await deactivateAccount(makeClient(), "user-1");
    expect(result.mode).toBe("deactivate");
    expect(result.message).toMatch(/deactivated/i);
    expect(result.message).not.toMatch(/permanently deleted/i);
    expect(result.remainsStored.join(" ")).toMatch(/Auth user|Projects|Storage|Usage/i);
  });
});
