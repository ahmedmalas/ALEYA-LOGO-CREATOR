/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrandHomeLink } from "./brand-home-link";

const getSession = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
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

describe("BrandHomeLink", () => {
  beforeEach(() => {
    getSession.mockReset();
    onAuthStateChange.mockReset();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("uses /dashboard when initialSignedIn is true and keeps it if session is slow", async () => {
    getSession.mockReturnValue(new Promise(() => {}));

    render(
      <BrandHomeLink initialSignedIn className="brand">
        ALEYA
      </BrandHomeLink>,
    );

    const link = screen.getByTestId("brand-home-link");
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.getAttribute("data-brand-home")).toBe("/dashboard");
  });

  it("uses / when signed out after session resolves", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    render(<BrandHomeLink>ALEYA</BrandHomeLink>);

    await waitFor(() => {
      expect(screen.getByTestId("brand-home-link").getAttribute("href")).toBe("/");
    });
  });

  it("switches to /dashboard when a session is present", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });

    render(<BrandHomeLink>ALEYA</BrandHomeLink>);

    await waitFor(() => {
      expect(screen.getByTestId("brand-home-link").getAttribute("href")).toBe("/dashboard");
    });
  });

  it("does not call signOut or clear storage", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    const clearSpy = vi.spyOn(Storage.prototype, "clear");
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

    render(
      <BrandHomeLink initialSignedIn>
        ALEYA
      </BrandHomeLink>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("brand-home-link").getAttribute("href")).toBe("/dashboard");
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
