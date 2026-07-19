/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./shell";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "t" } } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
    "data-brand-home"?: string;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("AppShell brand navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("points the ALEYA logo at /dashboard for signed-in app pages", () => {
    render(
      <AppShell email="user@example.com">
        <p>content</p>
      </AppShell>,
    );

    const brand = screen.getByTestId("brand-home-link");
    expect(brand.getAttribute("href")).toBe("/dashboard");
    expect(brand.textContent).toContain("ALEYA");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
