import sharp from "sharp";
import { toMonochromeSvg, wrapPreview } from "./svg-composer";

export type LogoAssetPack = {
  svg: string;
  transparentPng: Buffer;
  highResPng: Buffer;
  iconPng: Buffer;
  horizontalPng: Buffer;
  stackedPng: Buffer;
  monochromePng: Buffer;
  lightPreviewPng: Buffer;
  darkPreviewPng: Buffer;
  monochromeSvg: string;
  lightPreviewSvg: string;
  darkPreviewSvg: string;
};

export async function buildAssetPack(svgMarkup: string, aiPng?: Buffer): Promise<LogoAssetPack> {
  const monoSvg = toMonochromeSvg(svgMarkup, "#111111");
  const lightSvg = wrapPreview(svgMarkup, "#F7F4EF");
  const darkSvg = wrapPreview(svgMarkup, "#121212");

  const svgBuffer = Buffer.from(svgMarkup);
  const transparentPng = await sharp(svgBuffer).png().toBuffer();
  const highResPng = aiPng
    ? await sharp(aiPng).resize(2048, 2048, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    : await sharp(svgBuffer).resize(2048, 2048, { fit: "contain" }).png().toBuffer();
  const iconPng = await sharp(svgBuffer).resize(512, 512, { fit: "cover" }).png().toBuffer();
  const horizontalPng = await sharp(svgBuffer)
    .resize(1600, 600, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const stackedPng = await sharp(svgBuffer)
    .resize(1024, 1280, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const monochromePng = await sharp(Buffer.from(monoSvg)).png().toBuffer();
  const lightPreviewPng = await sharp(Buffer.from(lightSvg)).png().toBuffer();
  const darkPreviewPng = await sharp(Buffer.from(darkSvg)).png().toBuffer();

  return {
    svg: svgMarkup,
    transparentPng,
    highResPng,
    iconPng,
    horizontalPng,
    stackedPng,
    monochromePng,
    lightPreviewPng,
    darkPreviewPng,
    monochromeSvg: monoSvg,
    lightPreviewSvg: lightSvg,
    darkPreviewSvg: darkSvg,
  };
}

export function pathFor(
  ownerId: string,
  projectId: string,
  conceptId: string,
  filename: string,
): string {
  return `${ownerId}/${projectId}/${conceptId}/${filename}`;
}
