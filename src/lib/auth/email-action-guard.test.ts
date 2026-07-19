import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cooldownMessage,
  emailActionStorageKey,
  formatCountdown,
  getCooldownRemainingMs,
  isAuthEmailRateLimitError,
  mapAuthEmailError,
  markEmailActionSent,
} from "./email-action-guard";

describe("formatCountdown", () => {
  it("formats seconds and mm:ss", () => {
    expect(formatCountdown(5)).toBe("5s");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0s");
  });
});

describe("mapAuthEmailError", () => {
  it("rewrites rate-limit errors with countdown when provided", () => {
    expect(mapAuthEmailError("Email rate limit exceeded", { remainingSeconds: 42 })).toContain(
      "42s",
    );
    expect(isAuthEmailRateLimitError("429: email rate limit exceeded")).toBe(true);
  });

  it("keeps a friendly fallback without countdown", () => {
    expect(mapAuthEmailError("email rate limit exceeded")).toMatch(/wait about a minute/i);
  });
});

describe("localStorage cooldown", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks remaining cooldown per action and email", () => {
    const now = 1_000_000;
    markEmailActionSent("signup", "User@Example.com", now);
    expect(emailActionStorageKey("signup", "User@Example.com")).toBe(
      "aleya.auth.emailCooldown.signup:user@example.com",
    );
    expect(getCooldownRemainingMs("signup", "user@example.com", now + 15_000)).toBe(45_000);
    expect(getCooldownRemainingMs("signup", "user@example.com", now + 70_000)).toBe(0);
    expect(getCooldownRemainingMs("forgot_password", "user@example.com", now + 15_000)).toBe(0);
    expect(cooldownMessage(45)).toMatch(/45s/);
  });
});
