import * as cheerio from 'cheerio';
import { fetchPage, extractJsonLd, mapSchemaToRecipe, extractLinks, parseDuration, trySelectors, trySelectorsAll, trySelectorAttr, validateRecipe } from './baseScraper.js';
import type { Recipe, ScraperResult } from '../types/recipe.js';

const SITE_NAME = 'Budget Bytes';
const BASE_URL = 'https://www.budgetbytes.com';

function buildSearchUrl(query: string): string {
  return `${BASE_URL}/?s=${encodeURIComponent(query)}`;
}

async function getRecipeLinks(query: string, maxLinks: number = 3): Promise<string[]> {
  const searchUrl = buildSearchUrl(query);
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const links = extractLinks($, BASE_URL, [
    'article a[href*="budgetbytes.com"]',
    '.search-results a',
    '.post-summary a',
    'h2 a[href*="budgetbytes.com"]',
  ]);

  // Filter to actual recipe posts (not category/tag pages)
  const recipeLinks = links.filter(
    (link) =>
      link.includes('budgetbytes.com') &&
      !link.includes('/category/') &&
      !link.includes('/tag/') &&
      !link.includes('/page/')
  );

  return recipeLinks.slice(0, maxLinks);
}

async function scrapeRecipe(url: string): Promise<Recipe | null> {
  try {
    const html = await fetchPage(url);

    // Try JSON-LD first
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      return mapSchemaToRecipe(jsonLd, url, SITE_NAME);
    }

    // Fallback: parse HTML (WPRM = WP Recipe Maker plugin)
    const $ = cheerio.load(html);

    const name = trySelectors($, [
      'h2.wprm-recipe-name',
      'h1.entry-title',
      'h1',
    ]);
    if (!name) return null;

    const description = trySelectors($, [
      '.wprm-recipe-summary p',
    ]) || trySelectorAttr($, ['meta[name="description"]'], 'content');

    // Extract steps
    const steps = trySelectorsAll($, [
      '.wprm-recipe-instruction-text',
      '.wprm-recipe-instruction p',
      '.wprm-recipe-instruction-group li',
    ], 10);

    // Extract ingredients
    const ingredients = trySelectorsAll($, [
      'li.wprm-recipe-ingredient',
      '.wprm-recipe-ingredient-group li',
    ], 2);

    // Extract times from WPRM
    const prepTime = trySelectors($, [
      'span.wprm-recipe-prep_time-container',
    ]) || trySelectorAttr($, ['meta[itemprop="prepTime"]'], 'content');

    const cookTime = trySelectors($, [
      'span.wprm-recipe-cook_time-container',
    ]) || trySelectorAttr($, ['meta[itemprop="cookTime"]'], 'content');

    // Extract nutrition from WPRM (calories + macros)
    let calories = 0;
    let protein = '0g';
    let carbs = '0g';
    let fat = '0g';

    // WPRM uses data-nutrient attributes — try those first
    const nutrientSelectors: Record<string, string[]> = {
      calories: [
        'span.wprm-nutrition-field-value[data-nutrient="calories"]',
        'span.wprm-nutrition-field-value:first',
        '.wprm-nutrition-label-text-nutrient-container:contains("Calories") .wprm-nutrition-label-text-nutrient-value',
      ],
      protein: [
        'span.wprm-nutrition-field-value[data-nutrient="protein"]',
        '.wprm-nutrition-label-text-nutrient-container:contains("Protein") .wprm-nutrition-label-text-nutrient-value',
      ],
      carbs: [
        'span.wprm-nutrition-field-value[data-nutrient="carbohydrates"]',
        '.wprm-nutrition-label-text-nutrient-container:contains("Carb") .wprm-nutrition-label-text-nutrient-value',
      ],
      fat: [
        'span.wprm-nutrition-field-value[data-nutrient="fat"]',
        '.wprm-nutrition-label-text-nutrient-container:contains("Fat") .wprm-nutrition-label-text-nutrient-value',
      ],
    };

    for (const [nutrient, sels] of Object.entries(nutrientSelectors)) {
      const val = trySelectors($, sels);
      const match = val.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (nutrient === 'calories') calories = num;
        else if (nutrient === 'protein') protein = `${num}g`;
        else if (nutrient === 'carbs') carbs = `${num}g`;
        else if (nutrient === 'fat') fat = `${num}g`;
      }
    }

    const recipe: Recipe = {
      name,
      description,
      prepTime: parseDuration(prepTime) || 'N/A',
      cookTime: parseDuration(cookTime) || 'N/A',
      ingredients,
      steps: steps.length > 0 ? steps : ['Visit the recipe page for full instructions.'],
      whyItWorks: `A budget-friendly recipe from ${SITE_NAME}.`,
      nutrition: { calories, protein, carbs, fat },
      image: trySelectorAttr($, ['meta[property="og:image"]'], 'content'),
      sourceUrl: url,
      sourceSite: SITE_NAME,
    };

    return validateRecipe(recipe);
  } catch (error) {
    console.error(`[${SITE_NAME}] Error scraping ${url}:`, error);
    return null;
  }
}

export async function scrapeBudgetBytes(query: string): Promise<ScraperResult> {
  try {
    const links = await getRecipeLinks(query);

    if (links.length === 0) {
      return { recipes: [], siteName: SITE_NAME, success: true };
    }

    const recipePromises = links.map((link) => scrapeRecipe(link));
    const results = await Promise.allSettled(recipePromises);

    const recipes = results
      .filter((r): r is PromiseFulfilledResult<Recipe | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r): r is Recipe => r !== null);

    return { recipes, siteName: SITE_NAME, success: true };
  } catch (error: any) {
    console.error(`[${SITE_NAME}] Scraper failed:`, error.message);
    return { recipes: [], siteName: SITE_NAME, success: false, error: error.message };
  }
}
