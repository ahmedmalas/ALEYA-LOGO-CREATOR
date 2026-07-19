import { describe, expect, it, vi } from "vitest";
import { assertExportFormatsAllowed, PlanLimitError } from "./enforce";
import { getPlan } from "./catalog";
import { commitUsage, releaseUsage, reserveUsage } from "./usage-accounting";

function mockSupabase(handlers: Record<string, unknown>) {
  return handlers as never;
}

describe("plan enforcement", () => {
  it("blocks disallowed export formats", () => {
    const plan = getPlan("free");
    expect(() => assertExportFormatsAllowed(plan, ["SVG"])).not.toThrow();
    expect(() => assertExportFormatsAllowed(plan, ["PSD"])).toThrow(PlanLimitError);
  });

  it("releases reservations so failed ops do not consume allowance", async () => {
    const updates: unknown[] = [];
    const supabase = mockSupabase({
      from(table: string) {
        if (table === "usage_reservations") {
          return {
            insert() {
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: "res-1" }, error: null }),
                  };
                },
              };
            },
            update(payload: unknown) {
              updates.push(payload);
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        eq: async () => ({ error: null }),
                      };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === "usage_events") {
          return {
            insert: async () => ({ error: null }),
          };
        }
        return {};
      },
    });

    const id = await reserveUsage({
      supabase,
      ownerId: "user-1",
      eventType: "generation",
    });
    expect(id).toBe("res-1");
    await releaseUsage({ supabase, reservationId: id, ownerId: "user-1" });
    expect(updates[0]).toMatchObject({ status: "released" });
  });

  it("commits usage only after success", async () => {
    const events: unknown[] = [];
    const supabase = mockSupabase({
      from(table: string) {
        if (table === "usage_reservations") {
          return {
            update() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        eq: async () => ({ error: null }),
                      };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === "usage_events") {
          return {
            insert: async (payload: unknown) => {
              events.push(payload);
              return { error: null };
            },
          };
        }
        return {};
      },
    });

    await commitUsage({
      supabase,
      reservationId: "res-2",
      ownerId: "user-1",
      eventType: "export",
      metadata: {
        formats: ["SVG", "Transparent PNG", "Hi-res PNG", "Icon", "Horizontal", "Stacked", "Monochrome", "ZIP Brand Kit"],
      },
    });
    expect(events[0]).toMatchObject({
      event_type: "export",
      metadata: expect.objectContaining({
        formats: expect.arrayContaining(["SVG", "ZIP Brand Kit"]),
      }),
    });
  });
});
