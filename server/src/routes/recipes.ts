import { Router } from 'express';
import type { Request, Response } from 'express';
import { findRecipes, getScraperStatus } from '../services/recipeService.js';
import type { SearchParams } from '../types/recipe.js';

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

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scraper health & diagnostics endpoint
router.get('/scraper-status', (_req: Request, res: Response) => {
  const status = getScraperStatus();
  res.json(status);
});

export default router;
