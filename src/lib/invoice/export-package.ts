import JSZip from "jszip";
import {
  INVOICE_TEMPLATE_FORMAT,
  INVOICE_TEMPLATE_VERSION,
  type InvoiceTemplate,
} from "@/lib/invoice/types";

export type InvoiceTemplatePackage = {
  zipBuffer: Buffer;
  filename: string;
  template: InvoiceTemplate;
  manifest: {
    format: typeof INVOICE_TEMPLATE_FORMAT;
    version: string;
    createdAt: string;
    sourceMode: InvoiceTemplate["sourceMode"];
    files: string[];
  };
};

/** Build an Aleya Invoicing-importable ZIP package. */
export async function buildInvoiceTemplatePackage(input: {
  template: InvoiceTemplate;
  logoPng?: Buffer | null;
  htmlPreview?: string;
}): Promise<InvoiceTemplatePackage> {
  const zip = new JSZip();
  const template = {
    ...input.template,
    format: INVOICE_TEMPLATE_FORMAT,
    version: input.template.version || INVOICE_TEMPLATE_VERSION,
  };

  const files = ["template.json", "manifest.json"];
  zip.file("template.json", JSON.stringify(template, null, 2));

  if (input.logoPng?.length) {
    zip.folder("assets")?.file("logo.png", input.logoPng);
    files.push("assets/logo.png");
    template.assets = { ...template.assets, logo: "assets/logo.png" };
    zip.file("template.json", JSON.stringify(template, null, 2));
  }

  if (input.htmlPreview) {
    zip.file("preview.html", input.htmlPreview);
    files.push("preview.html");
  }

  const manifest = {
    format: INVOICE_TEMPLATE_FORMAT,
    version: INVOICE_TEMPLATE_VERSION,
    createdAt: new Date().toISOString(),
    sourceMode: template.sourceMode,
    files,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  const safeName = (template.sampleData.company.name || "invoice")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return {
    zipBuffer,
    filename: `${safeName || "invoice"}-template-${template.sourceMode}.zip`,
    template,
    manifest,
  };
}
