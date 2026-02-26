import { scrapeAllRecipes } from '../scrapers/allrecipes.js';
import { scrapeFoodNetwork } from '../scrapers/foodnetwork.js';
import { scrapeBBCGoodFood } from '../scrapers/bbcgoodfood.js';
import { scrapeEpicurious } from '../scrapers/epicurious.js';
import { scrapeBudgetBytes } from '../scrapers/budgetbytes.js';
import { parseTotalMinutes, getScraperHealth } from '../scrapers/baseScraper.js';
import type { Recipe, SearchParams, RecipeResponse, ScraperResult, ScraperMeta } from '../types/recipe.js';

// ── In-Memory Cache ──────────────────────────────────────────────
interface CacheEntry {
  data: RecipeResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCacheKey(params: SearchParams): string {
  return `${params.ingredients.toLowerCase().trim()}|${params.timeAvailable || ''}|${params.cuisine || ''}|${params.strictness || 'flexible'}`;
}

function getCached(key: string): RecipeResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: RecipeResponse): void {
  // Evict old entries if cache gets too large
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Demo Recipes Fallback ────────────────────────────────────────
const demoRecipes: Record<string, Recipe[]> = {
  chicken: [
    {
      name: 'Herb-Crusted Chicken Breast',
      description: 'Juicy pan-seared chicken with a crispy herb crust, perfect for a quick weeknight dinner.',
      prepTime: '10 minutes',
      cookTime: '20 minutes',
      ingredients: [
        '4 boneless skinless chicken breasts',
        '1 cup panko breadcrumbs',
        '2 tsp dried rosemary',
        '2 tsp dried thyme',
        '1 tsp dried oregano',
        '3 tbsp olive oil',
        'Salt and black pepper to taste',
      ],
      steps: [
        'Pat chicken breasts dry and season generously with salt and pepper.',
        'Mix breadcrumbs with dried herbs (rosemary, thyme, oregano) and a drizzle of olive oil.',
        'Press the herb mixture onto the top of each chicken breast.',
        'Heat oil in an oven-safe skillet over medium-high heat.',
        'Sear chicken crust-side down for 2 minutes, then flip.',
        'Transfer to a 400°F oven and bake for 15-18 minutes until internal temp reaches 165°F.',
        'Rest for 5 minutes before serving.',
      ],
      whyItWorks: 'The herb crust adds flavor and texture while keeping the chicken moist during cooking.',
      nutrition: { calories: 320, protein: '38g', carbs: '8g', fat: '14g' },
      image: '/gallery_pasta_plate.jpg',
    },
  ],
  pasta: [
    {
      name: 'Classic Spaghetti Carbonara',
      description: 'Authentic Roman pasta with crispy pancetta, eggs, and pecorino cheese.',
      prepTime: '10 minutes',
      cookTime: '15 minutes',
      ingredients: [
        '400g spaghetti',
        '200g pancetta or guanciale, diced',
        '4 large egg yolks',
        '2 whole eggs',
        '100g pecorino romano, finely grated',
        'Freshly cracked black pepper',
      ],
      steps: [
        'Bring a large pot of salted water to boil for pasta.',
        'Whisk eggs, egg yolks, and grated pecorino in a bowl. Set aside.',
        'Cook pancetta or guanciale until crispy, reserve the fat.',
        'Cook spaghetti until al dente, reserve 1 cup pasta water.',
        'Working quickly, toss hot pasta with pancetta off the heat.',
        'Add egg mixture, tossing vigorously to create creamy sauce.',
        'Add pasta water as needed. Season with black pepper and serve immediately.',
      ],
      whyItWorks: 'The residual heat from pasta gently cooks the eggs into a silky sauce without scrambling.',
      nutrition: { calories: 520, protein: '22g', carbs: '48g', fat: '28g' },
      image: '/gallery_pasta_plate.jpg',
    },
  ],
  quick: [
    {
      name: '15-Minute Fried Rice',
      description: 'Restaurant-style fried rice made easy with day-old rice and simple ingredients.',
      prepTime: '5 minutes',
      cookTime: '10 minutes',
      ingredients: [
        '4 cups cold cooked rice (day-old preferred)',
        '3 eggs',
        '2 tbsp vegetable oil',
        '1 cup frozen peas and carrots',
        '3 green onions, sliced',
        '3 tbsp soy sauce',
        '1 tsp sesame oil',
      ],
      steps: [
        'Use cold, day-old rice for best results (or spread fresh rice on a sheet pan to cool).',
        'Heat oil in a wok or large skillet over high heat.',
        'Scramble eggs, break into pieces, and set aside.',
        'Stir-fry diced vegetables (peas, carrots, green onions) for 2 minutes.',
        'Add rice and press flat against the hot pan to get some crispy bits.',
        'Add soy sauce, sesame oil, and return eggs to the pan.',
        'Toss everything together and serve hot.',
      ],
      whyItWorks: 'Cold rice separates easily and gets crispy edges when stir-fried at high heat.',
      nutrition: { calories: 340, protein: '10g', carbs: '48g', fat: '12g' },
      image: '/gallery_taco_prep.jpg',
    },
  ],
};

function getDemoFallback(ingredients: string): Recipe[] {
  const lower = ingredients.toLowerCase();
  const selected: Recipe[] = [];

  if (lower.includes('chicken')) selected.push(...(demoRecipes.chicken || []));
  if (lower.includes('pasta') || lower.includes('spaghetti')) selected.push(...(demoRecipes.pasta || []));
  if (lower.includes('rice') || lower.includes('egg')) selected.push(...(demoRecipes.quick || []));

  if (selected.length === 0) {
    return [demoRecipes.chicken[0], demoRecipes.pasta[0], demoRecipes.quick[0]];
  }
  return selected.slice(0, 3);
}

// ── Priority-Ordered Scraper Chain ──────────────────────────────
// Scrapers ranked by reliability and recipe quality.
// Tier 1 runs first; if enough results, Tier 2 is skipped.
interface ScraperDef {
  name: string;
  tier: 1 | 2;
  fn: (query: string) => Promise<ScraperResult>;
  timeoutMs: number;
}

const SCRAPER_CHAIN: ScraperDef[] = [
  // Tier 1 — most reliable, best JSON-LD support
  { name: 'AllRecipes',   tier: 1, fn: scrapeAllRecipes,   timeoutMs: 12_000 },
  { name: 'BBCGoodFood',  tier: 1, fn: scrapeBBCGoodFood,  timeoutMs: 12_000 },
  { name: 'BudgetBytes',  tier: 1, fn: scrapeBudgetBytes,  timeoutMs: 12_000 },
  // Tier 2 — backup sources
  { name: 'FoodNetwork',  tier: 2, fn: scrapeFoodNetwork,  timeoutMs: 10_000 },
  { name: 'Epicurious',   tier: 2, fn: scrapeEpicurious,   timeoutMs: 10_000 },
];

const MIN_RECIPES_FROM_TIER1 = 3; // If tier 1 returns >= 3, skip tier 2

// ── Per-Scraper Metrics ──────────────────────────────────────────
interface ScraperMetrics {
  totalRuns: number;
  successRuns: number;
  totalRecipes: number;
  totalResponseMs: number;
  lastSuccess: number;
  lastFailure: number;
}

const scraperMetrics = new Map<string, ScraperMetrics>();

function getOrCreateMetrics(name: string): ScraperMetrics {
  if (!scraperMetrics.has(name)) {
    scraperMetrics.set(name, {
      totalRuns: 0,
      successRuns: 0,
      totalRecipes: 0,
      totalResponseMs: 0,
      lastSuccess: 0,
      lastFailure: 0,
    });
  }
  return scraperMetrics.get(name)!;
}

function recordScraperMetrics(name: string, success: boolean, recipeCount: number, elapsedMs: number): void {
  const metrics = getOrCreateMetrics(name);
  metrics.totalRuns++;
  metrics.totalResponseMs += elapsedMs;
  metrics.totalRecipes += recipeCount;
  if (success && recipeCount > 0) {
    metrics.successRuns++;
    metrics.lastSuccess = Date.now();
  } else {
    metrics.lastFailure = Date.now();
  }
}

// ── In-Flight Request Deduplication ──────────────────────────────
const inFlightRequests = new Map<string, Promise<RecipeResponse>>();

/**
 * Run a scraper with a per-site timeout.
 * Records per-scraper metrics on completion.
 */
async function runWithTimeout(scraper: ScraperDef, query: string): Promise<ScraperResult> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      scraper.fn(query),
      new Promise<ScraperResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Scraper timeout after ${scraper.timeoutMs}ms`)), scraper.timeoutMs)
      ),
    ]);
    const elapsed = Date.now() - start;
    console.log(`  [${scraper.name}] ${result.recipes.length} recipes in ${elapsed}ms ${result.success ? '✓' : '⚠ (partial)'}`);
    recordScraperMetrics(scraper.name, result.success, result.recipes.length, elapsed);
    return result;
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.warn(`  [${scraper.name}] FAILED in ${elapsed}ms — ${error.message}`);
    recordScraperMetrics(scraper.name, false, 0, elapsed);
    return { recipes: [], siteName: scraper.name, success: false, error: error.message };
  }
}

// ── Scoring & Ranking ────────────────────────────────────────────
function scoreRecipe(recipe: Recipe, params: SearchParams): number {
  let score = 0;
  const ingredientsList = params.ingredients
    .toLowerCase()
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const recipeName = recipe.name.toLowerCase();
  const recipeDesc = recipe.description.toLowerCase();
  const recipeIngredients = recipe.ingredients.join(' ').toLowerCase();
  const recipeSteps = recipe.steps.join(' ').toLowerCase();
  const recipeText = `${recipeName} ${recipeDesc} ${recipeIngredients} ${recipeSteps}`;

  // Ingredient match score (most important)
  for (const ingredient of ingredientsList) {
    // Exact ingredient match in ingredient list is worth more
    if (recipeIngredients.includes(ingredient)) {
      score += 15;
    } else if (recipeText.includes(ingredient)) {
      score += 8;
    }
  }

  // Time filter
  if (params.timeAvailable) {
    const maxMinutes = parseInt(params.timeAvailable);
    if (maxMinutes > 0) {
      const totalTime = parseTotalMinutes(recipe.prepTime) + parseTotalMinutes(recipe.cookTime);
      if (totalTime > 0 && totalTime <= maxMinutes) {
        score += 5; // Bonus for being within time limit
      } else if (totalTime > maxMinutes) {
        score -= 15; // Penalty for exceeding time limit
      }
    }
  }

  // Cuisine match
  if (params.cuisine) {
    const cuisineLower = params.cuisine.toLowerCase();
    if (recipeText.includes(cuisineLower)) {
      score += 8;
    }
  }

  // Bonus for having complete nutrition data
  if (recipe.nutrition.calories > 0) score += 2;

  // Bonus for having ingredients list
  if (recipe.ingredients.length >= 3) score += 3;

  // Bonus for having actual cooking steps
  if (recipe.steps.length >= 3 && recipe.steps[0] !== 'Visit the recipe page for full instructions.') {
    score += 3;
  }

  // Bonus for having an image
  if (recipe.image) score += 1;

  return score;
}

// ── Scraper run log (in-memory, for health endpoint) ────────────
interface ScraperRunLog {
  timestamp: number;
  query: string;
  results: { site: string; recipes: number; success: boolean; error?: string; elapsedMs: number }[];
  totalRecipes: number;
  validRecipes: number;
  source: 'scraped' | 'demo';
}

const recentRuns: ScraperRunLog[] = [];
const MAX_RUN_LOG = 50;

/** Expose recent scraper runs + circuit breaker health + per-scraper metrics */
export function getScraperStatus() {
  // Build per-scraper metrics summary
  const perScraperMetrics: Record<string, {
    totalRuns: number;
    successRate: number;
    avgRecipesPerRun: number;
    avgResponseMs: number;
    lastSuccess: number;
    lastFailure: number;
  }> = {};

  for (const [name, metrics] of scraperMetrics) {
    perScraperMetrics[name] = {
      totalRuns: metrics.totalRuns,
      successRate: metrics.totalRuns > 0
        ? Math.round((metrics.successRuns / metrics.totalRuns) * 100)
        : 0,
      avgRecipesPerRun: metrics.totalRuns > 0
        ? Math.round((metrics.totalRecipes / metrics.totalRuns) * 10) / 10
        : 0,
      avgResponseMs: metrics.totalRuns > 0
        ? Math.round(metrics.totalResponseMs / metrics.totalRuns)
        : 0,
      lastSuccess: metrics.lastSuccess,
      lastFailure: metrics.lastFailure,
    };
  }

  return {
    circuitBreakers: getScraperHealth(),
    perScraperMetrics,
    recentRuns: recentRuns.slice(0, 20),
    stats: {
      totalRuns: recentRuns.length,
      scrapedSuccessRate: recentRuns.length > 0
        ? Math.round((recentRuns.filter(r => r.source === 'scraped').length / recentRuns.length) * 100)
        : 0,
    },
  };
}

// ── Main Service ─────────────────────────────────────────────────
export async function findRecipes(params: SearchParams): Promise<RecipeResponse> {
  // Check cache first
  const cacheKey = getCacheKey(params);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[Cache] Hit for:', cacheKey);
    return { ...cached, meta: { ...cached.meta!, fromCache: true } };
  }

  // In-flight deduplication: if same query is already running, piggyback on it
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    console.log('[Dedup] Awaiting in-flight request for:', cacheKey);
    return inFlight;
  }

  // Create and register the in-flight promise
  const promise = findRecipesInternal(params, cacheKey);
  inFlightRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/** Build ScraperMeta from a completed run log */
function buildMeta(runLog: ScraperRunLog): ScraperMeta {
  const scrapersUsed = runLog.results.filter(r => r.success && r.recipes > 0).map(r => r.site);
  const scrapersDown = runLog.results.filter(r => !r.success).map(r => r.site);
  return { scrapersUsed, scrapersDown, totalScraped: runLog.totalRecipes, fromCache: false };
}

async function findRecipesInternal(params: SearchParams, cacheKey: string): Promise<RecipeResponse> {
  const startTime = Date.now();
  console.log(`\n┌─ Recipe Search ──────────────────────────────────`);
  console.log(`│ Query: "${params.ingredients}"`);
  console.log(`│ Filters: time=${params.timeAvailable || 'any'}, cuisine=${params.cuisine || 'any'}, strictness=${params.strictness || 'flexible'}`);

  const runLog: ScraperRunLog = {
    timestamp: startTime,
    query: params.ingredients,
    results: [],
    totalRecipes: 0,
    validRecipes: 0,
    source: 'demo',
  };

  // ── Phase 1: Run Tier 1 scrapers in parallel ─────────────────
  const tier1 = SCRAPER_CHAIN.filter(s => s.tier === 1);
  const tier1Start = Date.now();
  console.log(`│\n│ Tier 1 (${tier1.map(s => s.name).join(', ')}):`);

  const tier1Results = await Promise.allSettled(
    tier1.map(s => runWithTimeout(s, params.ingredients))
  );

  let allRecipes: Recipe[] = [];
  const scraperTimings: Map<string, number> = new Map();

  for (let i = 0; i < tier1Results.length; i++) {
    const result = tier1Results[i];
    const scraper = tier1[i];
    const elapsed = Date.now() - tier1Start;

    if (result.status === 'fulfilled') {
      allRecipes.push(...result.value.recipes);
      runLog.results.push({
        site: scraper.name,
        recipes: result.value.recipes.length,
        success: result.value.success,
        error: result.value.error,
        elapsedMs: elapsed,
      });
    } else {
      runLog.results.push({
        site: scraper.name,
        recipes: 0,
        success: false,
        error: result.reason?.message || 'Unknown error',
        elapsedMs: elapsed,
      });
    }
    scraperTimings.set(scraper.name, elapsed);
  }

  // ── Phase 2: Run Tier 2 only if Tier 1 didn't return enough ───
  if (allRecipes.length < MIN_RECIPES_FROM_TIER1) {
    const tier2 = SCRAPER_CHAIN.filter(s => s.tier === 2);
    console.log(`│\n│ Tier 2 (${tier2.map(s => s.name).join(', ')}) — tier 1 returned only ${allRecipes.length}:`);
    const tier2Start = Date.now();

    const tier2Results = await Promise.allSettled(
      tier2.map(s => runWithTimeout(s, params.ingredients))
    );

    for (let i = 0; i < tier2Results.length; i++) {
      const result = tier2Results[i];
      const scraper = tier2[i];
      const elapsed = Date.now() - tier2Start;

      if (result.status === 'fulfilled') {
        allRecipes.push(...result.value.recipes);
        runLog.results.push({
          site: scraper.name,
          recipes: result.value.recipes.length,
          success: result.value.success,
          error: result.value.error,
          elapsedMs: elapsed,
        });
      } else {
        runLog.results.push({
          site: scraper.name,
          recipes: 0,
          success: false,
          error: result.reason?.message || 'Unknown error',
          elapsedMs: elapsed,
        });
      }
    }
  } else {
    console.log(`│\n│ Skipping Tier 2 — Tier 1 returned ${allRecipes.length} recipes`);
  }

  runLog.totalRecipes = allRecipes.length;
  console.log(`│\n│ Total scraped: ${allRecipes.length} recipes`);

  // ── Deduplicate by name ───────────────────────────────────────
  const seen = new Set<string>();
  allRecipes = allRecipes.filter(r => {
    const key = r.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Quality filter ────────────────────────────────────────────
  const validRecipes = allRecipes.filter((recipe) => {
    // Must have a real name (not too short)
    if (!recipe.name || recipe.name.length < 3) return false;

    // Must have at least 2 real cooking steps
    if (recipe.steps.length < 2 || recipe.steps[0] === 'Visit the recipe page for full instructions.') return false;

    // Must have nutrition data or at least a real description
    if (recipe.nutrition.calories === 0 && (!recipe.description || recipe.description.length < 20)) return false;

    // Reject category/collection/roundup URLs
    const url = (recipe.sourceUrl || '').toLowerCase();
    const badUrlPatterns = ['/category/', '/collection/', '/collections/', '/categories/', '/tag/', '/tags/'];
    if (badUrlPatterns.some((p) => url.includes(p))) return false;

    // Reject names that indicate a collection rather than a single recipe
    const nameLower = recipe.name.toLowerCase();
    const collectionKeywords = ['recipe ideas', 'recipe collection', 'recipes for', 'best recipes', 'top recipes', 'easy recipes for every', 'dietary needs', 'special occasion'];
    if (collectionKeywords.some((kw) => nameLower.includes(kw))) return false;

    // Must have valid prep OR cook time (not both N/A) unless it has nutrition or ingredients
    if (recipe.prepTime === 'N/A' && recipe.cookTime === 'N/A' && recipe.nutrition.calories === 0 && recipe.ingredients.length === 0) return false;

    return true;
  });

  runLog.validRecipes = validRecipes.length;
  console.log(`│ After quality filter: ${validRecipes.length} valid recipes`);

  // ── Score, rank, return ───────────────────────────────────────
  if (validRecipes.length > 0) {
    const scored = validRecipes
      .map((recipe) => ({ recipe, score: scoreRecipe(recipe, params) }))
      .sort((a, b) => b.score - a.score);

    // If strict mode, only return recipes with positive scores
    let filtered = scored;
    if (params.strictness === 'strict') {
      filtered = scored.filter((s) => s.score > 0);
    }

    const topRecipes = filtered.slice(0, 5).map((s) => s.recipe);

    if (topRecipes.length > 0) {
      const elapsed = Date.now() - startTime;
      runLog.source = 'scraped';
      console.log(`│ Returning ${topRecipes.length} recipes (top scores: ${scored.slice(0, 5).map(s => s.score).join(', ')})`);
      console.log(`└─ Done in ${elapsed}ms ─────────────────────────────\n`);

      // Save run log
      recentRuns.unshift(runLog);
      if (recentRuns.length > MAX_RUN_LOG) recentRuns.pop();

      const response: RecipeResponse = { recipes: topRecipes, source: 'scraped', meta: buildMeta(runLog) };
      setCache(cacheKey, response);
      return response;
    }
  }

  // ── Fallback to demo recipes ──────────────────────────────────
  const elapsed = Date.now() - startTime;
  console.log(`│ No valid scraped recipes — falling back to demo`);
  console.log(`└─ Done in ${elapsed}ms ─────────────────────────────\n`);

  runLog.source = 'demo';
  recentRuns.unshift(runLog);
  if (recentRuns.length > MAX_RUN_LOG) recentRuns.pop();

  const fallback = getDemoFallback(params.ingredients);
  const response: RecipeResponse = { recipes: fallback, source: 'demo', meta: buildMeta(runLog) };
  setCache(cacheKey, response);
  return response;
}
