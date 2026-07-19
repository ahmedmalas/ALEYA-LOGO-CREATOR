import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aleya-logo-creator.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ALEYA Logo Creator",
    template: "%s · ALEYA Logo Creator",
  },
  description:
    "Generate distinct brand marks, refine concepts, and export reusable Brand Kits with SVG and PNG assets.",
  applicationName: "ALEYA Logo Creator",
  keywords: [
    "logo creator",
    "brand kit",
    "logo generator",
    "SVG logo",
    "ALEYA",
    "brand identity",
  ],
  authors: [{ name: "ALEYA" }],
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: siteUrl,
    siteName: "ALEYA Logo Creator",
    title: "ALEYA Logo Creator",
    description:
      "Standalone logo creation with multi-concept generation, Brand Kits, and usable exports.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALEYA Logo Creator",
    description:
      "Generate, refine, and export brand marks with reusable Brand Kits.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ALEYA Logo Creator",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "Generate distinct brand marks, refine concepts, and export reusable Brand Kits with SVG and PNG assets.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "20 logo generations per hour with SVG and PNG Brand Kit exports",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "29",
      priceCurrency: "USD",
      description: "Waitlist for higher generation throughput and priority queue",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
