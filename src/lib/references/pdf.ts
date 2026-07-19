import sharp, { type Stats } from "sharp";

export const PDF_NO_CONTENT_MESSAGE =
  "PDF text/image extraction produced no content to analyse. Add a note or upload an image page.";

export type PreparedPdf = {
  pageCount: number;
  pagesProcessed: number[];
  text: string | null;
  /** PNG buffer of the first renderable page (or composite), when available. */
  pagePng: Buffer | null;
  /** True when the PDF has neither extractable text nor non-blank visual content. */
  isBlank: boolean;
  hasContent: boolean;
};

const MAX_PAGES_FOR_TEXT = 5;
const MAX_RENDER_WIDTH = 1024;

function isNearlyBlankImageStats(stats: Stats): boolean {
  if (!stats.channels.length) return true;
  const mean =
    stats.channels.reduce((sum: number, channel) => sum + channel.mean, 0) /
    stats.channels.length;
  const stdev =
    stats.channels.reduce((sum: number, channel) => sum + channel.stdev, 0) /
    stats.channels.length;
  // Pure/near-white empty pages from MuPDF land around mean≈255, stdev≈0.
  return mean >= 250 && stdev <= 1.5;
}

async function loadMupdf() {
  return import("mupdf");
}

/**
 * Extract text and rasterize page images from a PDF buffer.
 * Vision analysis uses the first page image; text from the first N pages is retained as a hint.
 */
export async function preparePdfForAnalysis(buffer: Buffer): Promise<PreparedPdf> {
  const mupdf = await loadMupdf();
  let doc: InstanceType<typeof mupdf.Document>;
  try {
    doc = mupdf.Document.openDocument(buffer, "application/pdf");
  } catch {
    return {
      pageCount: 0,
      pagesProcessed: [],
      text: null,
      pagePng: null,
      isBlank: true,
      hasContent: false,
    };
  }

  const pageCount = Math.max(0, doc.countPages());
  if (pageCount === 0) {
    return {
      pageCount: 0,
      pagesProcessed: [],
      text: null,
      pagePng: null,
      isBlank: true,
      hasContent: false,
    };
  }

  const textPages = Math.min(pageCount, MAX_PAGES_FOR_TEXT);
  const pageTexts: string[] = [];
  for (let i = 0; i < textPages; i++) {
    try {
      const page = doc.loadPage(i);
      const structured = page.toStructuredText("preserve-spans");
      const pageText = (structured.asText?.() ?? "").replace(/\s+/g, " ").trim();
      if (pageText) pageTexts.push(pageText);
    } catch {
      // Continue; rasterization may still succeed.
    }
  }
  const text = pageTexts.join("\n").trim().slice(0, 4000) || null;

  let pagePng: Buffer | null = null;
  let pageVisuallyBlank = true;
  try {
    const page = doc.loadPage(0);
    const bounds = page.getBounds();
    const width = Math.max(1, bounds[2] - bounds[0]);
    const scale = Math.min(2.5, MAX_RENDER_WIDTH / width);
    const matrix = mupdf.Matrix.scale(scale, scale);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const png = Buffer.from(pixmap.asPNG());
    const stats = await sharp(png).stats();
    pageVisuallyBlank = isNearlyBlankImageStats(stats);
    if (!pageVisuallyBlank) {
      pagePng = await sharp(png)
        .resize(MAX_RENDER_WIDTH, MAX_RENDER_WIDTH, { fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer();
    }
  } catch {
    pagePng = null;
    pageVisuallyBlank = true;
  }

  const hasVisual = Boolean(pagePng) && !pageVisuallyBlank;
  const hasText = Boolean(text?.trim());
  const hasContent = hasText || hasVisual;
  const isBlank = !hasContent;

  return {
    pageCount,
    // Honest: we send the first page image to vision (when available).
    pagesProcessed: hasContent ? [1] : [],
    text,
    pagePng: hasVisual ? pagePng : null,
    isBlank,
    hasContent,
  };
}

/** Upload-time text extraction (no raster required). */
export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const prepared = await preparePdfForAnalysis(buffer);
    return prepared.text;
  } catch {
    return null;
  }
}

export function pdfPagesProcessedList(pageCount: number, analysedFirstPage: boolean): number[] {
  if (!analysedFirstPage || pageCount <= 0) return [];
  return [1];
}
