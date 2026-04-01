import type { Context } from "https://edge.netlify.com";

const CRAWLER_UA_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /whatsapp/i, /telegrambot/i,
  /slackbot/i, /discordbot/i, /applebot/i,
];

function isCrawler(userAgent: string): boolean {
  return CRAWLER_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

/** Convert slug to title case for fallback meta */
function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+\d+$/, ''); // Remove trailing ID numbers
}

/** Build fallback meta tags when API is unavailable */
function buildFallbackSeoBlock(slug: string, recipeUrl: string): string {
  const title = `${slugToTitle(slug)} | chickpea`;
  const description = `Discover this recipe on chickpea.kitchen — your AI-powered recipe companion.`;
  const image = "https://chickpea.kitchen/og-image.png";

  return `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${recipeUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <link rel="canonical" href="${recipeUrl}" />
  `;
}

export default async (request: Request, context: Context) => {
  const userAgent = request.headers.get("user-agent") || "";

  // Let real users through to the SPA
  if (!isCrawler(userAgent)) {
    return context.next();
  }

  // Extract slug from URL: /recipe/:slug
  const url = new URL(request.url);
  const slug = url.pathname.replace("/recipe/", "").replace(/\/$/, "");

  if (!slug) return context.next();

  const recipeUrl = `https://chickpea.kitchen/recipe/${slug}`;

  try {
    // Fetch recipe data from the API
    const apiUrl = Deno.env.get("API_URL") || "https://chickpea-api.onrender.com";
    const res = await fetch(`${apiUrl}/api/recipes/public/${encodeURIComponent(slug)}`);

    if (!res.ok) {
      // Fallback: inject generic meta tags so crawlers still get something
      const response = await context.next();
      let html = await response.text();
      const fallbackTitle = `${slugToTitle(slug)} | chickpea`;
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${fallbackTitle}</title>`);
      html = html.replace("</head>", `${buildFallbackSeoBlock(slug, recipeUrl)}</head>`);
      return new Response(html, {
        headers: {
          ...Object.fromEntries(response.headers),
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    }

    const { recipe } = await res.json();
    if (!recipe) return context.next();

    // Get the original SPA HTML
    const response = await context.next();
    let html = await response.text();

    // Inject meta tags
    const title = `${recipe.name} | chickpea`;
    const description = recipe.description
      ? recipe.description.slice(0, 160)
      : `${recipe.name} recipe with ${recipe.ingredients?.length || 0} ingredients. Cook time: ${recipe.cookTime || "N/A"}.`;
    const image = recipe.image || "https://chickpea.kitchen/og-image.png";

    // Build enhanced Schema.org Recipe JSON-LD
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: recipe.name,
      description: recipe.description || "",
      image: recipe.image || "",
      author: {
        "@type": "Organization",
        name: "chickpea",
        url: "https://chickpea.kitchen",
      },
      datePublished: recipe.created_at || new Date().toISOString(),
      prepTime: recipe.prepTime || undefined,
      cookTime: recipe.cookTime || undefined,
      totalTime: recipe.totalTime || undefined,
      recipeYield: recipe.servings || undefined,
      recipeCategory: recipe.tags?.[0] || "Main Course",
      keywords: (recipe.tags || []).join(", "),
      recipeIngredient: recipe.ingredients || [],
      recipeInstructions: (recipe.steps || []).map((step: string, i: number) => ({
        "@type": "HowToStep",
        position: i + 1,
        text: step,
      })),
      nutrition: recipe.nutrition?.calories ? {
        "@type": "NutritionInformation",
        calories: `${recipe.nutrition.calories} calories`,
        proteinContent: recipe.nutrition.protein,
        carbohydrateContent: recipe.nutrition.carbs,
        fatContent: recipe.nutrition.fat,
      } : undefined,
      ...(recipe.rating ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: recipe.rating,
          ratingCount: 1,
          bestRating: 5,
        },
      } : {}),
    });

    // Replace title
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

    // Replace/inject meta tags
    html = html.replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${description}">`
    );

    // Inject OG + Twitter + JSON-LD before </head>
    const seoBlock = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${recipeUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <link rel="canonical" href="${recipeUrl}" />
    <script type="application/ld+json">${jsonLd}</script>
    `;

    html = html.replace("</head>", `${seoBlock}</head>`);

    return new Response(html, {
      headers: {
        ...Object.fromEntries(response.headers),
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // On any error, inject fallback meta tags
    try {
      const response = await context.next();
      let html = await response.text();
      const fallbackTitle = `${slugToTitle(slug)} | chickpea`;
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${fallbackTitle}</title>`);
      html = html.replace("</head>", `${buildFallbackSeoBlock(slug, recipeUrl)}</head>`);
      return new Response(html, {
        headers: {
          ...Object.fromEntries(response.headers),
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    } catch {
      return context.next();
    }
  }
};
