import { z } from "zod";

export const INVOICE_TEMPLATE_FORMAT = "aleya.invoiceTemplate" as const;
export const INVOICE_TEMPLATE_VERSION = "1.0.0" as const;

export const invoiceRecreationModes = ["mirror", "refine", "advance"] as const;
export type InvoiceRecreationMode = (typeof invoiceRecreationModes)[number];

export const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const regionTypeSchema = z.enum([
  "logo",
  "company",
  "invoiceMeta",
  "customer",
  "shipping",
  "table",
  "totals",
  "notes",
  "payment",
  "footer",
  "title",
  "decorative",
]);

export const regionStyleSchema = z.object({
  fontFamily: z.string().default("Helvetica"),
  fontSize: z.number().default(11),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  color: z.string().default("#111827"),
  align: z.enum(["left", "center", "right"]).default("left"),
  background: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
});

export const templateRegionSchema = z.object({
  id: z.string(),
  type: regionTypeSchema,
  label: z.string().default(""),
  bounds: boundsSchema,
  style: regionStyleSchema.default({
    fontFamily: "Helvetica",
    fontSize: 11,
    fontWeight: "normal",
    color: "#111827",
    align: "left",
  }),
  binding: z.string().default(""),
  editable: z.boolean().default(true),
});

export const tableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  binding: z.string(),
  width: z.number(),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export const invoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  tax: z.number().default(0),
  discount: z.number().default(0),
  total: z.number(),
  date: z.string().optional(),
});

export const invoiceSampleDataSchema = z.object({
  company: z.object({
    name: z.string(),
    logo: z.string().optional(),
    address: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    abn: z.string().default(""),
  }),
  customer: z.object({
    name: z.string(),
    address: z.string().default(""),
    email: z.string().default(""),
  }),
  shipping: z
    .object({
      name: z.string().default(""),
      address: z.string().default(""),
    })
    .optional(),
  invoice: z.object({
    number: z.string(),
    issueDate: z.string(),
    dueDate: z.string(),
    title: z.string().default("TAX INVOICE"),
  }),
  items: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
  tax: z.number(),
  discount: z.number().default(0),
  total: z.number(),
  payment: z.object({
    instructions: z.string().default(""),
  }),
  notes: z.string().default(""),
  terms: z.string().default(""),
});

export const invoiceTemplateSchema = z.object({
  format: z.literal(INVOICE_TEMPLATE_FORMAT),
  version: z.string(),
  page: z.object({
    size: z.enum(["A4", "Letter"]).default("A4"),
    orientation: z.enum(["portrait", "landscape"]).default("portrait"),
    widthPt: z.number().default(595.28),
    heightPt: z.number().default(841.89),
    margins: z.object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number(),
    }),
  }),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    textColor: z.string(),
    mutedColor: z.string(),
    borderColor: z.string(),
    backgroundColor: z.string(),
    fontFamily: z.string(),
    headingFontFamily: z.string(),
  }),
  regions: z.array(templateRegionSchema),
  table: z.object({
    regionId: z.string().default("line-items"),
    columns: z.array(tableColumnSchema),
    headerBackground: z.string().default("#F3F4F6"),
    headerTextColor: z.string().default("#111827"),
    rowBorderColor: z.string().default("#E5E7EB"),
  }),
  variables: z.array(z.string()),
  sampleData: invoiceSampleDataSchema,
  sourceMode: z.enum(invoiceRecreationModes),
  layoutProfile: z.enum(["generic", "quantum-hire"]).default("generic"),
  analysis: z.record(z.string(), z.unknown()).optional(),
  assets: z
    .object({
      logo: z.string().optional(),
      /** Inline PNG/JPEG for import into Aleya Invoicing renderer. */
      logoDataUrl: z.string().optional(),
    })
    .default({}),
});

export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>;
export type InvoiceSampleData = z.infer<typeof invoiceSampleDataSchema>;
export type TemplateRegion = z.infer<typeof templateRegionSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

/** Detected invoice analysis (pre-template). */
export const invoiceAnalysisSchema = z.object({
  pageSize: z.enum(["A4", "Letter"]).default("A4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margins: z
    .object({
      top: z.number().default(48),
      right: z.number().default(48),
      bottom: z.number().default(48),
      left: z.number().default(48),
    })
    .default({ top: 48, right: 48, bottom: 48, left: 48 }),
  backgroundColor: z.string().default("#FFFFFF"),
  primaryColor: z.string().default("#1F4D45"),
  secondaryColor: z.string().default("#B08A4F"),
  textColor: z.string().default("#111827"),
  borderColor: z.string().default("#D1D5DB"),
  companyName: z.string().default(""),
  companyAddress: z.string().default(""),
  companyEmail: z.string().default(""),
  companyPhone: z.string().default(""),
  companyAbn: z.string().default(""),
  hasLogo: z.boolean().default(false),
  invoiceTitle: z.string().default("TAX INVOICE"),
  invoiceNumber: z.string().default(""),
  issueDate: z.string().default(""),
  dueDate: z.string().default(""),
  customerName: z.string().default(""),
  customerAddress: z.string().default(""),
  customerEmail: z.string().default(""),
  shippingName: z.string().default(""),
  shippingAddress: z.string().default(""),
  tableHeaders: z.array(z.string()).default([]),
  items: z.array(invoiceLineItemSchema).default([]),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  discount: z.number().default(0),
  total: z.number().default(0),
  paymentInstructions: z.string().default(""),
  bankDetails: z.string().default(""),
  notes: z.string().default(""),
  terms: z.string().default(""),
  footer: z.string().default(""),
  typography: z.string().default("sans-serif"),
  layoutProfile: z.enum(["generic", "quantum-hire"]).default("generic"),
  confidence: z.number().min(0).max(1).default(0.5),
  summary: z.string().default(""),
  rawTextExcerpt: z.string().default(""),
});

export type InvoiceAnalysis = z.infer<typeof invoiceAnalysisSchema>;

export const DEFAULT_VARIABLES = [
  "{{company.name}}",
  "{{company.logo}}",
  "{{company.address}}",
  "{{company.email}}",
  "{{company.phone}}",
  "{{company.abn}}",
  "{{customer.name}}",
  "{{customer.address}}",
  "{{customer.email}}",
  "{{invoice.number}}",
  "{{invoice.issueDate}}",
  "{{invoice.dueDate}}",
  "{{invoice.title}}",
  "{{items}}",
  "{{subtotal}}",
  "{{tax}}",
  "{{discount}}",
  "{{total}}",
  "{{payment.instructions}}",
  "{{notes}}",
  "{{terms}}",
] as const;
