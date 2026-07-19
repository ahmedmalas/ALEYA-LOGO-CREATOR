import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

/** Build a text-extractable PDF for regression tests. */
export async function buildTextPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText("ALEYA LOGO CREATOR", {
    x: 72,
    y: 720,
    size: 28,
    font,
    color: rgb(0.12, 0.3, 0.27),
  });
  page.drawText("Brand reference document with extractable text.", {
    x: 72,
    y: 680,
    size: 14,
    font,
  });
  return Buffer.from(await doc.save());
}

/** Build a vector-artwork PDF (shapes + label) for regression tests. */
export async function buildVectorPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawCircle({
    x: 306,
    y: 500,
    size: 80,
    color: rgb(0.85, 0.2, 0.15),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 4,
  });
  page.drawRectangle({
    x: 200,
    y: 300,
    width: 210,
    height: 60,
    color: rgb(0.08, 0.25, 0.24),
  });
  page.drawText("VECTOR MARK", {
    x: 230,
    y: 320,
    size: 18,
    font,
    color: rgb(1, 1, 1),
  });
  return Buffer.from(await doc.save());
}

/** Build a scanned/image-only PDF (no extractable text layer). */
export async function buildScannedPdf(): Promise<Buffer> {
  const img = await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: { r: 250, g: 245, b: 235 },
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#faf5eb"/>
      <circle cx="400" cy="350" r="120" fill="#c45c26"/>
      <text x="400" y="560" text-anchor="middle" font-size="48" font-family="Arial" fill="#1f4d45">SCANNED LOGO</text>
      <text x="400" y="620" text-anchor="middle" font-size="24" font-family="Arial" fill="#333">Image-only PDF page</text>
    </svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  const doc = await PDFDocument.create();
  const png = await doc.embedPng(img);
  const page = doc.addPage([png.width, png.height]);
  page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
  return Buffer.from(await doc.save());
}

/** Build a blank PDF with neither text nor visual content. */
export async function buildBlankPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

/** Build a multi-page text PDF. */
export async function buildMultiPagePdf(pages = 3): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`Page ${i} content for ALEYA`, { x: 72, y: 720, size: 20, font });
  }
  return Buffer.from(await doc.save());
}
