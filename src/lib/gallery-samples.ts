export type GallerySample = {
  id: string;
  businessName: string;
  tagline: string;
  industry: string;
  style: string;
  layout: string;
  primary: string;
  secondary: string;
  accent: string;
  svg: string;
};

export const GALLERY_SAMPLES: GallerySample[] = [
  {
    id: "northwind",
    businessName: "Northwind Craft",
    tagline: "Built with clarity",
    industry: "Design",
    style: "elegant",
    layout: "icon-left",
    primary: "#1F4D45",
    secondary: "#B08A4F",
    accent: "#1F4D45",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Northwind Craft logo"><g transform="translate(20,70) scale(0.85)"><path d="M60 22 L92 95 H28 Z" fill="#1F4D45" opacity="0.92"/><circle cx="60" cy="65" r="28" fill="#B08A4F"/><text x="60" y="74" text-anchor="middle" font-size="22" font-family="Georgia, serif" font-weight="700" fill="#F7F4EF">NC</text></g><text x="220" y="175" font-size="40" font-family="Georgia, serif" font-weight="700" fill="#121212">Northwind Craft</text><text x="220" y="210" font-size="16" font-family="sans-serif" fill="#1F4D45">Built with clarity</text></svg>`,
  },
  {
    id: "harbor",
    businessName: "Harbor Line",
    tagline: "Steady logistics",
    industry: "Logistics",
    style: "corporate",
    layout: "wordmark",
    primary: "#0B3C5D",
    secondary: "#328CC1",
    accent: "#0B3C5D",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Harbor Line logo"><text x="256" y="200" text-anchor="middle" font-size="48" font-family="IBM Plex Sans, sans-serif" font-weight="700" fill="#0B3C5D">Harbor Line</text><text x="256" y="235" text-anchor="middle" font-size="16" letter-spacing="4" font-family="sans-serif" fill="#328CC1">STEADY LOGISTICS</text><rect x="170" y="250" width="172" height="3" fill="#0B3C5D"/></svg>`,
  },
  {
    id: "lumen",
    businessName: "Lumen Atelier",
    tagline: "Light as craft",
    industry: "Interior design",
    style: "luxury",
    layout: "icon-top",
    primary: "#2C1810",
    secondary: "#C4A574",
    accent: "#2C1810",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Lumen Atelier logo"><g transform="translate(40,40)"><path d="M60 18 C90 18 108 40 108 68 C108 96 60 118 60 118 C60 118 12 96 12 68 C12 40 30 18 60 18 Z" fill="#2C1810"/><circle cx="60" cy="65" r="28" fill="#C4A574"/><text x="60" y="74" text-anchor="middle" font-size="22" font-family="Georgia, serif" font-weight="700" fill="#F7F4EF">LA</text></g><text x="256" y="220" text-anchor="middle" font-size="42" font-family="Playfair Display, Georgia, serif" font-weight="700" fill="#121212">Lumen Atelier</text><text x="256" y="255" text-anchor="middle" font-size="16" font-family="sans-serif" fill="#2C1810">Light as craft</text></svg>`,
  },
  {
    id: "volt",
    businessName: "Volt & Co",
    tagline: "Energy for makers",
    industry: "Technology",
    style: "bold",
    layout: "badge",
    primary: "#111827",
    secondary: "#F59E0B",
    accent: "#111827",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Volt and Co logo"><rect x="96" y="90" width="320" height="220" rx="24" fill="#111827"/><path d="M250 130 L290 210 H255 L285 270 L210 185 H245 Z" fill="#F59E0B"/><text x="256" y="250" text-anchor="middle" font-size="28" font-family="Anton, sans-serif" font-weight="700" fill="#F7F4EF">Volt &amp; Co</text><text x="256" y="278" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#F59E0B">Energy for makers</text></svg>`,
  },
  {
    id: "cedar",
    businessName: "Cedar Clinic",
    tagline: "Care that lasts",
    industry: "Healthcare",
    style: "minimal",
    layout: "monogram",
    primary: "#14532D",
    secondary: "#86EFAC",
    accent: "#14532D",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Cedar Clinic logo"><circle cx="256" cy="180" r="110" fill="#14532D"/><text x="256" y="198" text-anchor="middle" font-size="72" font-family="Inter, sans-serif" font-weight="700" fill="#F7F4EF">CC</text><text x="256" y="330" text-anchor="middle" font-size="22" font-family="sans-serif" fill="#121212">Cedar Clinic</text><text x="256" y="358" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#14532D">Care that lasts</text></svg>`,
  },
  {
    id: "mesa",
    businessName: "Mesa Goods",
    tagline: "Everyday objects",
    industry: "Retail",
    style: "modern",
    layout: "icon-left",
    primary: "#7C2D12",
    secondary: "#FDBA74",
    accent: "#7C2D12",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Mesa Goods logo"><g transform="translate(20,70) scale(0.85)"><path d="M30 30 H90 V90 H30 Z" fill="#7C2D12"/><circle cx="60" cy="65" r="28" fill="#FDBA74"/><text x="60" y="74" text-anchor="middle" font-size="22" font-family="Space Grotesk, sans-serif" font-weight="700" fill="#121212">MG</text></g><text x="220" y="175" font-size="40" font-family="Space Grotesk, sans-serif" font-weight="700" fill="#121212">Mesa Goods</text><text x="220" y="210" font-size="16" font-family="sans-serif" fill="#7C2D12">Everyday objects</text></svg>`,
  },
  {
    id: "aurelia",
    businessName: "Aurelia Finance",
    tagline: "Quiet confidence",
    industry: "Finance",
    style: "premium",
    layout: "icon-top",
    primary: "#1E293B",
    secondary: "#C0A062",
    accent: "#1E293B",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Aurelia Finance logo"><g transform="translate(176,40) scale(0.7)"><path d="M60 20 L100 40 L100 90 L60 110 L20 90 L20 40 Z" fill="#1E293B"/><circle cx="60" cy="65" r="28" fill="#C0A062"/><text x="60" y="74" text-anchor="middle" font-size="22" font-family="Cormorant Garamond, serif" font-weight="700" fill="#F7F4EF">AF</text></g><text x="256" y="220" text-anchor="middle" font-size="40" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" fill="#121212">Aurelia Finance</text><text x="256" y="255" text-anchor="middle" font-size="16" font-family="sans-serif" fill="#1E293B">Quiet confidence</text></svg>`,
  },
  {
    id: "bloom",
    businessName: "Bloom Kitchen",
    tagline: "Seasonal plates",
    industry: "Hospitality",
    style: "elegant",
    layout: "wordmark",
    primary: "#3F6212",
    secondary: "#D9F99D",
    accent: "#3F6212",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Bloom Kitchen logo"><text x="256" y="200" text-anchor="middle" font-size="46" font-family="Libre Baskerville, Georgia, serif" font-weight="700" fill="#3F6212">Bloom Kitchen</text><text x="256" y="240" text-anchor="middle" font-size="16" letter-spacing="3" font-family="sans-serif" fill="#121212">SEASONAL PLATES</text><circle cx="256" cy="280" r="8" fill="#D9F99D" stroke="#3F6212"/></svg>`,
  },
];
