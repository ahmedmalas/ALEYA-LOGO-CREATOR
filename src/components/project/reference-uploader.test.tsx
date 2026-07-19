/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceUploader } from "./reference-uploader";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReferenceUploader", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            references: [],
            limits: {
              maxFilesPerProject: 10,
              maxFileBytes: 5 * 1024 * 1024,
              maxTotalBytesPerUser: 50 * 1024 * 1024,
              helpText: "Upload your current logo",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  it("shows limits and queues files with validation errors for bad types", async () => {
    render(<ReferenceUploader projectId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByTestId("reference-limits").textContent).toMatch(/10 files/);
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bad = new File(["x"], "x.gif", { type: "image/gif" });
    fireEvent.change(input, { target: { files: [bad] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported format/i)).toBeTruthy();
    });
  });

  it("queues a valid PNG for upload", async () => {
    render(<ReferenceUploader projectId={null} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const png = new File([new Uint8Array([1, 2, 3])], "mark.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [png] } });
    await waitFor(() => {
      expect(screen.getByText("mark.png")).toBeTruthy();
      expect(screen.getByText(/Queued files upload after you save/i)).toBeTruthy();
    });
  });
});
