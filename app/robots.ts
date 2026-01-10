import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/quote/thank-you",
          "/contact/thank-you",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
