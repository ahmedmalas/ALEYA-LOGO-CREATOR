import { sanitizeHexColor } from "@/lib/security/colors";
import type { ConceptPalette } from "@/types/logo";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Client-safe helper: recolour fills and swap logo text in SVG markup. */
export function applyConceptEdits(
  svg: string,
  edits: { logoText?: string; primary?: string; secondary?: string; accent?: string },
  current?: Partial<ConceptPalette> & { logoText?: string },
): string {
  let out = svg;
  if (edits.primary && current?.primary) {
    out = out.replaceAll(current.primary, sanitizeHexColor(edits.primary, current.primary));
  }
  if (edits.secondary && current?.secondary) {
    out = out.replaceAll(current.secondary, sanitizeHexColor(edits.secondary, current.secondary));
  }
  if (edits.accent && current?.accent) {
    out = out.replaceAll(current.accent, sanitizeHexColor(edits.accent, current.accent));
  }
  if (edits.logoText && current?.logoText && edits.logoText !== current.logoText) {
    const from = escapeXml(current.logoText);
    const to = escapeXml(edits.logoText);
    out = out.replaceAll(from, to);
    out = out.replaceAll(current.logoText, edits.logoText);
  }
  return out;
}
