import type { Context } from "https://edge.netlify.com";

export default async (_request: Request, _context: Context) => {
  const apiUrl = Deno.env.get("API_URL") || "https://chickpea-api.onrender.com";

  let recipeEntries = "";

  try {
    const res = await fetch(`${apiUrl}/api/recipes/public`);
    if (res.ok) {
      const { recipes } = await res.json();
      for (const recipe of recipes || []) {
        const lastmod = recipe.created_at
          ? new Date(recipe.created_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        recipeEntries += `
  <url>
    <loc>https://chickpea.kitchen/recipe/${encodeURIComponent(recipe.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }
  } catch {
    // If API is down, return just the homepage in the sitemap
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://chickpea.kitchen/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>${recipeEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
