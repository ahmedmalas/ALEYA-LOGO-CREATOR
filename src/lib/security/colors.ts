const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Strict CSS hex colours only — blocks attribute injection into SVG. */
export function isSafeHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

export function sanitizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return isSafeHexColor(trimmed) ? trimmed : fallback;
}

export function sanitizeColorList(values: string[] | null | undefined, max = 8): string[] {
  if (!values?.length) return [];
  const out: string[] = [];
  for (const value of values) {
    if (!isSafeHexColor(value)) continue;
    out.push(value.trim());
    if (out.length >= max) break;
  }
  return out;
}
