import type { GallerySample } from "@/lib/gallery-samples";

export function SampleLogo({
  sample,
  background = "#F7F4EF",
  className = "",
}: {
  sample: GallerySample;
  background?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex aspect-square items-center justify-center overflow-hidden ${className}`}
      style={{ background }}
      dangerouslySetInnerHTML={{ __html: sample.svg }}
    />
  );
}
