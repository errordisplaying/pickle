import { Router } from 'express';
import type { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { findRecipes, getScraperStatus } from '../services/recipeService.js';
import type { SearchParams } from '../types/recipe.js';
import {
  fetchPage,
  extractJsonLd,
  mapSchemaToRecipe,
  trySelectors,
  trySelectorsAll,
  validateRecipe,
  parseDuration,
} from '../scrapers/baseScraper.js';
import type { Recipe } from '../types/recipe.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── Input Sanitization ──────────────────────────────────────────
const MAX_INGREDIENTS_LEN = 500;
const MAX_CUISINE_LEN = 100;
const MAX_TIME_LEN = 20;

/** Strip HTML tags, collapse whitespace, trim, and enforce max length */
function sanitize(input: string | undefined, maxLen: number): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim()
    .slice(0, maxLen) || undefined;
}

// ── In-Memory Rate Limiter (per-IP, sliding window) ─────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;           // max requests per window

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    bucket.timestamps = bucket.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (bucket.timestamps.length === 0) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);

  if (!bucket) {
    bucket = { timestamps: [] };
    rateBuckets.set(ip, bucket);
  }

  // Remove timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  bucket.timestamps.push(now);
  return false;
}

// ── Recipe Search Endpoint ──────────────────────────────────────
router.post('/recipes', async (req: Request, res: Response) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }

    const { ingredients, timeAvailable, cuisine, strictness, relatedTerms } = req.body;

    // Sanitize inputs
    const cleanIngredients = sanitize(ingredients, MAX_INGREDIENTS_LEN);
    const cleanCuisine = sanitize(cuisine, MAX_CUISINE_LEN);
    const cleanTime = sanitize(timeAvailable, MAX_TIME_LEN);
    const cleanStrictness = sanitize(strictness, 20);

    // Sanitize relatedTerms (AI-expanded synonyms)
    const cleanRelatedTerms = Array.isArray(relatedTerms)
      ? relatedTerms
          .filter((t: any) => typeof t === 'string')
          .map((t: string) => t.trim().slice(0, 50))
          .slice(0, 20)
      : undefined;

    // Validate required fields
    if (!cleanIngredients) {
      res.status(400).json({ error: 'Ingredients are required.' });
      return;
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`[API] POST /api/recipes`);
    console.log(`  Ingredients: ${cleanIngredients}`);
    console.log(`  Time: ${cleanTime || 'any'}`);
    console.log(`  Cuisine: ${cleanCuisine || 'any'}`);
    console.log(`  Strictness: ${cleanStrictness || 'flexible'}`);
    if (cleanRelatedTerms?.length) console.log(`  Related terms: ${cleanRelatedTerms.join(', ')}`);
    console.log(`${'─'.repeat(50)}`);

    const result = await findRecipes({
      ingredients: cleanIngredients,
      timeAvailable: cleanTime,
      cuisine: cleanCuisine,
      strictness: cleanStrictness,
      relatedTerms: cleanRelatedTerms,
    });

    console.log(`[API] Returning ${result.recipes.length} recipes (source: ${result.source})`);

    res.json(result);
  } catch (error: any) {
    console.error('[API] Error:', error.message);
    res.status(500).json({
      error: 'Failed to find recipes. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ── Scrape Single URL Endpoint ──────────────────────────────────
const MAX_URL_LEN = 2048;

/** Validate that a string is a safe, external HTTP(S) URL */
function isValidRecipeUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) return false;
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** HTML fallback: try generic selectors when JSON-LD is missing */
function scrapeWithHtmlFallback(html: string, sourceUrl: string): Recipe | null {
  const $ = cheerio.load(html);
  const hostname = new URL(sourceUrl).hostname.replace('www.', '');

  const name = trySelectors($, [
    'h1[itemprop="name"]', 'h1.recipe-title', 'h1.entry-title',
    'h1.wprm-recipe-name', 'h1', '[itemprop="name"]',
  ]);

  const ingredients = trySelectorsAll($, [
    '[itemprop="recipeIngredient"]', '.wprm-recipe-ingredient',
    '.recipe-ingredients li', '.ingredients li',
    '.ingredient-list li', '.mntl-structured-ingredients__list-item',
  ]);

  const steps = trySelectorsAll($, [
    '[itemprop="recipeInstructions"] li', '[itemprop="step"] [itemprop="text"]',
    '.wprm-recipe-instruction-text', '.recipe-directions li',
    '.instructions li', '.step-body p', '.mntl-sc-block-html',
  ], 10);

  const description = trySelectors($, [
    '[itemprop="description"]', '.recipe-summary p',
    '.recipe-description', 'meta[name="description"]',
  ]);

  const image = $('meta[property="og:image"]').attr('content')
    || $('[itemprop="image"]').first().attr('src')
    || $('[itemprop="image"]').first().attr('content')
    || '';

  const prepTime = trySelectors($, ['[itemprop="prepTime"]', '.prep-time']);
  const cookTime = trySelectors($, ['[itemprop="cookTime"]', '.cook-time']);

  if (!name || ingredients.length < 2 || steps.length === 0) return null;

  const recipe: Recipe = {
    name,
    description: description || '',
    prepTime: parseDuration(prepTime) || 'N/A',
    cookTime: parseDuration(cookTime) || 'N/A',
    ingredients,
    steps,
    whyItWorks: `A recipe imported from ${hostname}.`,
    nutrition: { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
    image,
    sourceUrl,
    sourceSite: hostname,
  };

  return validateRecipe(recipe);
}

router.post('/scrape-url', async (req: Request, res: Response) => {
  try {
    // Rate limiting (shares the same limiter)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'A recipe URL is required.' });
      return;
    }

    const cleanUrl = url.trim().slice(0, MAX_URL_LEN);
    if (!isValidRecipeUrl(cleanUrl)) {
      res.status(400).json({ error: 'Please enter a valid recipe URL (https://...).' });
      return;
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`[API] POST /api/scrape-url`);
    console.log(`  URL: ${cleanUrl}`);
    console.log(`${'─'.repeat(50)}`);

    // Fetch the page
    const html = await fetchPage(cleanUrl, { timeoutMs: 15_000 });
    const hostname = new URL(cleanUrl).hostname.replace('www.', '');

    // Try JSON-LD first (most reliable)
    let recipe: Recipe | null = null;
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      recipe = mapSchemaToRecipe(jsonLd, cleanUrl, hostname);
    }

    // Fall back to HTML scraping
    if (!recipe) {
      recipe = scrapeWithHtmlFallback(html, cleanUrl);
    }

    if (!recipe) {
      res.status(404).json({ error: 'No recipe found on that page. Try a direct recipe link (not a search or category page).' });
      return;
    }

    console.log(`[API] Imported: "${recipe.name}" from ${hostname} (${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps)`);

    res.json({ recipe });
  } catch (error: any) {
    console.error('[API] Scrape URL error:', error.message);

    if (error.message?.includes('Circuit breaker')) {
      res.status(503).json({ error: 'That site is temporarily unavailable. Please try again later.' });
      return;
    }

    res.status(500).json({
      error: 'Failed to import recipe. The site may be blocking requests or the page structure is unsupported.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scraper health & diagnostics endpoint
router.get('/scraper-status', (_req: Request, res: Response) => {
  const status = getScraperStatus();
  res.json(status);
});

// ── Public Recipe Persistence (for SEO permalinks) ──────────────

/** Upsert a recipe into the public_recipes table for SEO indexing */
router.post('/recipes/public', async (req: Request, res: Response) => {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  try {
    const { recipe } = req.body;
    if (!recipe?.id || !recipe?.name) {
      res.status(400).json({ error: 'Recipe with id and name is required.' });
      return;
    }

    const { error } = await supabase
      .from('public_recipes')
      .upsert({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        image: recipe.image || '',
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        nutrition: recipe.nutrition || { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
        tags: recipe.tags || [],
        source_url: recipe.sourceUrl || null,
        source_site: recipe.sourceSite || null,
        prep_time: recipe.prepTime || 'N/A',
        cook_time: recipe.cookTime || 'N/A',
        total_time: recipe.totalTime || 'N/A',
        difficulty: recipe.difficulty || 'Medium',
        why_it_works: recipe.whyItWorks || '',
      }, { onConflict: 'id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Public recipe upsert error:', error.message);
    res.status(500).json({ error: 'Failed to save recipe.' });
  }
});

/** Fetch a public recipe by slug/id for permalink pages */
router.get('/recipes/public/:slug', async (req: Request, res: Response) => {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  try {
    const { slug } = req.params;
    const { data, error } = await supabase
      .from('public_recipes')
      .select('*')
      .eq('id', slug)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    // Map DB row back to Recipe shape
    const recipe = {
      name: data.name,
      description: data.description,
      prepTime: data.prep_time,
      cookTime: data.cook_time,
      totalTime: data.total_time,
      ingredients: data.ingredients,
      steps: data.steps,
      whyItWorks: data.why_it_works,
      nutrition: data.nutrition,
      image: data.image,
      sourceUrl: data.source_url,
      sourceSite: data.source_site,
      tags: data.tags,
      difficulty: data.difficulty,
      id: data.id,
    };

    res.json({ recipe });
  } catch (error: any) {
    console.error('[API] Public recipe fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

/** List all public recipes for sitemap generation */
router.get('/recipes/public', async (_req: Request, res: Response) => {
  if (!supabase) {
    res.json({ recipes: [] });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('public_recipes')
      .select('id, name, image, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    res.json({ recipes: data || [] });
  } catch (error: any) {
    console.error('[API] Public recipes list error:', error.message);
    res.json({ recipes: [] });
  }
});

export default router;
