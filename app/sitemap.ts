import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";

  // Static pages
  const staticPages = [
    "",
    "/services",
    "/process",
    "/compliance",
    "/about",
    "/contact",
    "/quote",
    "/track",
  ];

  const routes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" as const : "monthly" as const,
    priority: route === "" ? 1 : route === "/quote" ? 0.9 : 0.8,
  }));

  return routes;
}
