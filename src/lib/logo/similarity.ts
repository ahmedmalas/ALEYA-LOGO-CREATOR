import sharp from "sharp";
import { ssim } from "ssim.js";

export type SimilarityReport = {
  ssim: number;
  mse: number;
  /** 0–100 visual match score combining SSIM and inverse MSE. */
  score: number;
  passed: boolean;
  threshold: number;
};

/** Default Mirror acceptance — recognisably the same logo at a glance. */
export const MIRROR_SIMILARITY_THRESHOLD = 0.78;

async function toGrayImageData(png: Buffer, size = 256): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const { data, info } = await sharp(png)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

function mse(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 4) {
    // luminance-ish
    const la = 0.299 * a[i]! + 0.587 * a[i + 1]! + 0.114 * a[i + 2]!;
    const lb = 0.299 * b[i]! + 0.587 * b[i + 1]! + 0.114 * b[i + 2]!;
    const d = la - lb;
    sum += d * d;
  }
  return sum / (n / 4);
}

export async function compareLogoVisuals(
  referencePng: Buffer,
  candidateSvgOrPng: Buffer | string,
  options?: { threshold?: number },
): Promise<SimilarityReport> {
  const threshold = options?.threshold ?? MIRROR_SIMILARITY_THRESHOLD;
  const candidatePng =
    typeof candidateSvgOrPng === "string" ||
    (Buffer.isBuffer(candidateSvgOrPng) && candidateSvgOrPng.slice(0, 5).toString().includes("svg"))
      ? await sharp(Buffer.isBuffer(candidateSvgOrPng) ? candidateSvgOrPng : Buffer.from(candidateSvgOrPng))
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toBuffer()
      : await sharp(candidateSvgOrPng as Buffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toBuffer();

  const ref = await toGrayImageData(referencePng);
  const cand = await toGrayImageData(candidatePng);
  const result = ssim(ref, cand);
  const ssimValue = typeof result === "object" && result && "mssim" in result ? Number(result.mssim) : 0;
  const err = mse(ref.data, cand.data);
  // Map MSE (~0–65025) into 0–1 friendliness
  const mseScore = Math.max(0, 1 - err / 8000);
  const score = Math.round((ssimValue * 0.75 + mseScore * 0.25) * 100);
  return {
    ssim: ssimValue,
    mse: err,
    score,
    passed: ssimValue >= threshold,
    threshold,
  };
}

export class MirrorSimilarityError extends Error {
  report: SimilarityReport;
  constructor(report: SimilarityReport, detail?: string) {
    super(
      detail ||
        `Mirror result failed visual similarity gate (SSIM ${report.ssim.toFixed(3)} < ${report.threshold}).`,
    );
    this.name = "MirrorSimilarityError";
    this.report = report;
  }
}
