import * as cheerio from 'cheerio';
import { fetchPage, extractJsonLd, mapSchemaToRecipe, extractLinks, trySelectors, trySelectorsAll, trySelectorAttr, validateRecipe } from './baseScraper.js';
import type { Recipe, ScraperResult } from '../types/recipe.js';

const SITE_NAME = 'Epicurious';
const BASE_URL = 'https://www.epicurious.com';

function buildSearchUrl(query: string): string {
  return `${BASE_URL}/search/${encodeURIComponent(query)}`;
}

async function getRecipeLinks(query: string, maxLinks: number = 3): Promise<string[]> {
  const searchUrl = buildSearchUrl(query);
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const links = extractLinks($, BASE_URL, [
    'a[href*="/recipes/"]',
    '.results-group a[href*="/recipes/"]',
    'article a[href*="/recipes/"]',
  ]);

  // Filter to recipe pages only
  const recipeLinks = links.filter(
    (link) => link.includes('/recipes/') && !link.includes('/gallery/')
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

    // Fallback: parse HTML with resilient selector chains
    const $ = cheerio.load(html);

    const name = trySelectors($, [
      'h1[data-testid="ContentHeaderHed"]',
      'h1',
    ]);
    if (!name) return null;

    const description = trySelectorAttr($, ['meta[name="description"]'], 'content')
      || trySelectors($, [
        'p[class*="dek"]',
        'p[data-testid="ContentHeaderDek"]',
      ]);

    // Extract steps
    const steps = trySelectorsAll($, [
      'div[class*="preparation"] li p',
      '.preparation-steps li p',
      '[data-testid*="InstructionList"] li p',
      '.steps-list li p',
    ], 10);

    // Extract ingredients
    const ingredients = trySelectorsAll($, [
      'div[class*="ingredient"] li p',
      '.ingredient-list li',
      '[data-testid*="IngredientList"] li',
    ], 2);

    // Extract nutrition (calories + macros)
    let calories = 0;
    let protein = '0g';
    let carbs = '0g';
    let fat = '0g';

    // Epicurious nutrition info
    const nutritionRows = $('[data-testid*="NutritionInfo"] li, .nutrition-info li, .nutrition-body tr');
    nutritionRows.each((_, row) => {
      const text = $(row).text().toLowerCase().trim();
      const numMatch = text.match(/(\d+)/);
      if (!numMatch) return;
      const num = parseInt(numMatch[1]);

      if (text.includes('calorie')) calories = num;
      else if (text.includes('protein')) protein = `${num}g`;
      else if (text.includes('carb')) carbs = `${num}g`;
      else if (text.includes('fat') && !text.includes('saturated')) fat = `${num}g`;
    });

    const recipe: Recipe = {
      name,
      description,
      prepTime: 'N/A',
      cookTime: 'N/A',
      ingredients,
      steps: steps.length > 0 ? steps : ['Visit the recipe page for full instructions.'],
      whyItWorks: `An expertly curated recipe from ${SITE_NAME}.`,
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

export async function scrapeEpicurious(query: string): Promise<ScraperResult> {
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
