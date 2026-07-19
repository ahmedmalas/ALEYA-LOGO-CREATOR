import { describe, expect, it } from "vitest";
import {
  buildBlankPdf,
  buildMultiPagePdf,
  buildScannedPdf,
  buildTextPdf,
  buildVectorPdf,
} from "@/lib/references/pdf-fixtures";
import { PDF_NO_CONTENT_MESSAGE, preparePdfForAnalysis } from "@/lib/references/pdf";

describe("preparePdfForAnalysis", () => {
  it("extracts text from a text PDF and produces a page raster", async () => {
    const prepared = await preparePdfForAnalysis(await buildTextPdf());
    expect(prepared.hasContent).toBe(true);
    expect(prepared.isBlank).toBe(false);
    expect(prepared.text).toMatch(/ALEYA LOGO CREATOR/i);
    expect(prepared.pageCount).toBe(1);
    expect(prepared.pagesProcessed).toEqual([1]);
    expect(prepared.pagePng).toBeInstanceOf(Buffer);
    expect(prepared.pagePng!.length).toBeGreaterThan(1000);
  });

  it("rasterizes scanned/image-only PDFs with no text layer", async () => {
    const prepared = await preparePdfForAnalysis(await buildScannedPdf());
    expect(prepared.text).toBeNull();
    expect(prepared.hasContent).toBe(true);
    expect(prepared.isBlank).toBe(false);
    expect(prepared.pagesProcessed).toEqual([1]);
    expect(prepared.pagePng).toBeInstanceOf(Buffer);
    expect(prepared.pagePng!.length).toBeGreaterThan(1000);
  });

  it("rasterizes vector PDFs with shapes", async () => {
    const prepared = await preparePdfForAnalysis(await buildVectorPdf());
    expect(prepared.hasContent).toBe(true);
    expect(prepared.isBlank).toBe(false);
    expect(prepared.pagePng).toBeInstanceOf(Buffer);
    expect(prepared.pagePng!.length).toBeGreaterThan(1000);
    // Vector fixture includes a label; text may also be present.
    expect(prepared.pagesProcessed).toEqual([1]);
  });

  it("marks blank PDFs as no content", async () => {
    const prepared = await preparePdfForAnalysis(await buildBlankPdf());
    expect(prepared.isBlank).toBe(true);
    expect(prepared.hasContent).toBe(false);
    expect(prepared.text).toBeNull();
    expect(prepared.pagePng).toBeNull();
    expect(prepared.pagesProcessed).toEqual([]);
    expect(PDF_NO_CONTENT_MESSAGE).toMatch(/no content to analyse/i);
  });

  it("analyses the first page of multi-page PDFs", async () => {
    const prepared = await preparePdfForAnalysis(await buildMultiPagePdf(3));
    expect(prepared.pageCount).toBe(3);
    expect(prepared.pagesProcessed).toEqual([1]);
    expect(prepared.text).toMatch(/Page 1 content for ALEYA/i);
    expect(prepared.hasContent).toBe(true);
    expect(prepared.pagePng).toBeInstanceOf(Buffer);
  });
});
