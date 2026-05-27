import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lingocon.com";

    return {
        rules: [
            // Allow Googlebot full access to public pages
            {
                userAgent: "Googlebot",
                allow: ["/", "/lang/", "/browse", "/search", "/families", "/docs", "/uploads/"],
                disallow: ["/api/", "/studio/", "/dashboard/", "/settings/", "/favorites/", "/admin/"],
            },
            // Allow Google Image crawler to index language flags
            {
                userAgent: "Googlebot-Image",
                allow: ["/uploads/"],
                disallow: [],
            },
            // General rules for all other bots
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/studio/", "/dashboard/", "/settings/", "/favorites/", "/admin/"],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
