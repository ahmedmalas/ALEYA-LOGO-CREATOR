import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aleya-logo-creator.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/gallery", "/pricing", "/login", "/signup"],
      disallow: ["/dashboard", "/projects", "/brand-kits", "/api/", "/integrate", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
