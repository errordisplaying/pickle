import * as cheerio from 'cheerio';
import type { Recipe, RecipeNutrition } from '../types/recipe.js';

// Rotate through realistic User-Agent strings
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ── Circuit Breaker ─────────────────────────────────────────────
// Prevents hammering a site that's down, saving time and avoiding bans.
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitState>();
const CIRCUIT_FAILURE_THRESHOLD = 3;   // Open circuit after 3 consecutive failures
const CIRCUIT_RESET_MS = 5 * 60 * 1000; // Try again after 5 minutes

function getCircuit(domain: string): CircuitState {
  if (!circuitBreakers.has(domain)) {
    circuitBreakers.set(domain, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitBreakers.get(domain)!;
}

function recordSuccess(domain: string): void {
  const circuit = getCircuit(domain);
  circuit.failures = 0;
  circuit.isOpen = false;
}

function recordFailure(domain: string): void {
  const circuit = getCircuit(domain);
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit.isOpen = true;
    console.warn(`[CircuitBreaker] OPEN for ${domain} after ${circuit.failures} failures — will retry after ${CIRCUIT_RESET_MS / 1000}s`);
  }
}

function isCircuitOpen(domain: string): boolean {
  const circuit = getCircuit(domain);
  if (!circuit.isOpen) return false;
  // Allow half-open: try again after reset window
  if (Date.now() - circuit.lastFailure > CIRCUIT_RESET_MS) {
    circuit.isOpen = false;
    circuit.failures = 0;
    console.log(`[CircuitBreaker] Half-open for ${domain} — allowing retry`);
    return false;
  }
  return true;
}

/** Expose circuit breaker health for the dashboard */
export function getScraperHealth(): Record<string, { failures: number; isOpen: boolean; lastFailure: number }> {
  const health: Record<string, { failures: number; isOpen: boolean; lastFailure: number }> = {};
  for (const [domain, state] of circuitBreakers) {
    health[domain] = { failures: state.failures, isOpen: state.isOpen, lastFailure: state.lastFailure };
  }
  return health;
}

// ── Retry with exponential back-off ─────────────────────────────
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface FetchOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Fetch a web page with retry logic, exponential backoff, and circuit breaker.
 * - Retries up to `maxRetries` times on transient failures (network errors, 5xx, 429).
 * - Skips the request entirely if the site's circuit breaker is open.
 */
export async function fetchPage(url: string, options: FetchOptions = {}): Promise<string> {
  const { maxRetries = 2, timeoutMs = 10_000 } = options;
  const domain = new URL(url).hostname;

  // Circuit breaker check
  if (isCircuitOpen(domain)) {
    throw new Error(`Circuit breaker OPEN for ${domain} — skipping request`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      // Non-retryable client errors (400, 403, 404) — fail immediately
      if (!response.ok && !RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Retryable server/rate-limit errors
      if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status)) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * 2 ** attempt, 8000);
        if (attempt < maxRetries) {
          console.warn(`[fetchPage] ${url} returned ${response.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delayMs);
          continue;
        }
        throw new Error(`HTTP ${response.status} after ${maxRetries + 1} attempts`);
      }

      const text = await response.text();
      recordSuccess(domain);
      return text;
    } catch (error: any) {
      lastError = error;

      // AbortError = timeout
      const isTimeout = error.name === 'AbortError';
      const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.cause?.code === 'ECONNRESET';
      const isRetryable = isTimeout || isNetworkError;

      if (isRetryable && attempt < maxRetries) {
        const delayMs = Math.min(1000 * 2 ** attempt, 8000);
        console.warn(`[fetchPage] ${url} failed (${isTimeout ? 'timeout' : error.code || 'network error'}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delayMs);
        continue;
      }

      // Out of retries or non-retryable error
      recordFailure(domain);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Should not reach here, but just in case
  recordFailure(domain);
  throw lastError || new Error(`fetchPage failed for ${url}`);
}

/**
 * Extract JSON-LD structured data from HTML (Schema.org Recipe type)
 */
export function extractJsonLd(html: string): any | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html();
      if (!content) continue;

      const data = JSON.parse(content);

      // Handle @graph arrays (common pattern)
      if (data['@graph']) {
        const recipe = data['@graph'].find(
          (item: any) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        );
        if (recipe) return recipe;
      }

      // Direct Recipe type
      if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
        return data;
      }

      // Array of items
      if (Array.isArray(data)) {
        const recipe = data.find(
          (item: any) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        );
        if (recipe) return recipe;
      }
    } catch {
      // Invalid JSON, skip this script tag
      continue;
    }
  }

  return null;
}

/**
 * Convert ISO 8601 duration (PT30M, PT1H15M) to human-readable string
 */
export function parseDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return 'N/A';

  // Already human readable
  if (!isoDuration.startsWith('PT') && !isoDuration.startsWith('P')) {
    return isoDuration;
  }

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  if (minutes > 0) return `${minutes} minutes`;
  return 'N/A';
}

/**
 * Parse total time in minutes from ISO duration or human-readable string
 */
export function parseTotalMinutes(duration: string | undefined): number {
  if (!duration) return 0;

  // ISO 8601
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    return (parseInt(isoMatch[1] || '0') * 60) + parseInt(isoMatch[2] || '0');
  }

  // Human readable: "30 minutes", "1 hour", "1 hr 15 min"
  const hrMatch = duration.match(/(\d+)\s*(?:hr|hour)/i);
  const minMatch = duration.match(/(\d+)\s*(?:min)/i);
  return (parseInt(hrMatch?.[1] || '0') * 60) + parseInt(minMatch?.[1] || '0');
}

/**
 * Extract nutrition info from Schema.org nutrition data
 */
function parseNutrition(nutritionData: any): RecipeNutrition {
  if (!nutritionData) {
    return { calories: 0, protein: '0g', carbs: '0g', fat: '0g' };
  }

  const parseValue = (val: string | undefined): string => {
    if (!val) return '0g';
    // Remove "g", "mg", "calories" etc and normalize
    const num = val.replace(/[^\d.]/g, '');
    if (!num) return '0g';
    return `${Math.round(parseFloat(num))}g`;
  };

  const parseCals = (val: string | undefined): number => {
    if (!val) return 0;
    const num = val.replace(/[^\d.]/g, '');
    return num ? Math.round(parseFloat(num)) : 0;
  };

  return {
    calories: parseCals(nutritionData.calories),
    protein: parseValue(nutritionData.proteinContent),
    carbs: parseValue(nutritionData.carbohydrateContent),
    fat: parseValue(nutritionData.fatContent),
  };
}

/**
 * Extract recipe steps from Schema.org recipeInstructions
 */
function parseInstructions(instructions: any): string[] {
  if (!instructions) return ['No instructions available.'];

  // String
  if (typeof instructions === 'string') {
    return instructions
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // Array of strings
  if (Array.isArray(instructions) && typeof instructions[0] === 'string') {
    return instructions.map((s: string) => s.trim()).filter(Boolean);
  }

  // Array of HowToStep objects
  if (Array.isArray(instructions)) {
    const steps: string[] = [];
    for (const item of instructions) {
      if (item['@type'] === 'HowToStep' && item.text) {
        steps.push(item.text.trim());
      } else if (item['@type'] === 'HowToSection' && item.itemListElement) {
        // HowToSection contains nested HowToSteps
        for (const subItem of item.itemListElement) {
          if (subItem.text) steps.push(subItem.text.trim());
        }
      } else if (typeof item === 'object' && item.text) {
        steps.push(item.text.trim());
      }
    }
    return steps.length > 0 ? steps : ['No instructions available.'];
  }

  return ['No instructions available.'];
}

/**
 * Extract image URL from Schema.org image data
 */
function parseImage(imageData: any): string {
  if (!imageData) return '';
  if (typeof imageData === 'string') return imageData;
  if (Array.isArray(imageData)) {
    const first = imageData[0];
    if (typeof first === 'string') return first;
    return first?.url || first?.contentUrl || '';
  }
  return imageData.url || imageData.contentUrl || '';
}

/**
 * Extract ingredients from Schema.org recipeIngredient data
 */
function parseIngredients(ingredientData: any): string[] {
  if (!ingredientData) return [];
  if (Array.isArray(ingredientData)) {
    return ingredientData
      .map((item: any) => typeof item === 'string' ? item.trim() : item?.text?.trim() || '')
      .filter(Boolean);
  }
  if (typeof ingredientData === 'string') {
    return ingredientData.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// ── Collection / Roundup Detection ───────────────────────────────
const COLLECTION_KEYWORDS = [
  'best recipes', 'top recipes', 'recipe ideas', 'recipe collection',
  'recipe roundup', 'recipes for every', 'easy recipes for',
  'top 10', 'top 20', 'top 50', 'best of', 'our favorite',
  'recipe index', 'all recipes for', 'dietary needs', 'special occasion',
];

/**
 * Validate that a parsed recipe has enough substance to be useful.
 * Returns null if the recipe fails quality checks (invalid/collection page).
 */
export function validateRecipe(recipe: Recipe): Recipe | null {
  // Name must exist and be reasonable length
  if (!recipe.name || recipe.name.length < 3 || recipe.name.length > 200) return null;

  // Must have at least 2 ingredients
  if (recipe.ingredients.length < 2) return null;

  // Must have at least 1 real step (not just a placeholder)
  if (
    recipe.steps.length === 0 ||
    (recipe.steps.length === 1 && recipe.steps[0] === 'Visit the recipe page for full instructions.')
  ) return null;

  // Reject collection/roundup page names
  const nameLower = recipe.name.toLowerCase();
  if (COLLECTION_KEYWORDS.some(kw => nameLower.includes(kw))) return null;

  return recipe;
}

/**
 * Map Schema.org Recipe JSON-LD to our Recipe interface.
 * Returns null if the parsed recipe fails validation.
 */
export function mapSchemaToRecipe(schema: any, sourceUrl: string, siteName: string): Recipe | null {
  const steps = parseInstructions(schema.recipeInstructions);
  const nutrition = parseNutrition(schema.nutrition);
  const ingredients = parseIngredients(schema.recipeIngredient);

  const recipe: Recipe = {
    name: schema.name || 'Untitled Recipe',
    description: schema.description || '',
    prepTime: parseDuration(schema.prepTime),
    cookTime: parseDuration(schema.cookTime),
    ingredients,
    steps,
    whyItWorks: schema.description
      ? `This recipe from ${siteName} features: ${(schema.recipeCategory || schema.recipeCuisine || 'a variety of flavors')}.`
      : `A popular recipe from ${siteName}.`,
    nutrition,
    image: parseImage(schema.image),
    sourceUrl,
    sourceSite: siteName,
  };

  return validateRecipe(recipe);
}

/**
 * Try multiple CSS selectors in order, return the text content of the first match.
 * Useful for resilient HTML fallback parsing when sites change their class names.
 */
export function trySelectors($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    try {
      const text = $(selector).first().text().trim();
      if (text) return text;
    } catch {
      // Selector might be malformed, skip it
      continue;
    }
  }
  return '';
}

/**
 * Try multiple CSS selectors in order, return text content of ALL matched elements
 * from the first selector that produces results.
 */
export function trySelectorsAll($: cheerio.CheerioAPI, selectors: string[], minLength: number = 0): string[] {
  for (const selector of selectors) {
    try {
      const results: string[] = [];
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > minLength) results.push(text);
      });
      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * Try multiple CSS selectors, return the attribute value of the first match.
 */
export function trySelectorAttr($: cheerio.CheerioAPI, selectors: string[], attr: string): string {
  for (const selector of selectors) {
    try {
      const val = $(selector).first().attr(attr)?.trim();
      if (val) return val;
    } catch {
      continue;
    }
  }
  return '';
}

/**
 * Extract recipe links from a search results page using common patterns
 */
export function extractLinks($: cheerio.CheerioAPI, baseUrl: string, selectors: string[]): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      let href = $(el).attr('href');
      if (!href) return;

      // Make absolute
      if (href.startsWith('/')) {
        href = new URL(href, baseUrl).href;
      }

      // Deduplicate
      if (!seen.has(href) && href.startsWith('http')) {
        seen.add(href);
        links.push(href);
      }
    });
  }

  return links;
}
