import * as cheerio from 'cheerio';
import { fetchPage, extractJsonLd, mapSchemaToRecipe, extractLinks, parseDuration, trySelectors, trySelectorsAll, trySelectorAttr, validateRecipe } from './baseScraper.js';
import type { Recipe, ScraperResult } from '../types/recipe.js';

const SITE_NAME = 'BBC Good Food';
const BASE_URL = 'https://www.bbcgoodfood.com';

function buildSearchUrl(query: string): string {
  return `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
}

async function getRecipeLinks(query: string, maxLinks: number = 3): Promise<string[]> {
  const searchUrl = buildSearchUrl(query);
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const links = extractLinks($, BASE_URL, [
    'a[href*="/recipes/"]',
    '.search-results a[href*="/recipes/"]',
    '.standard-card-new__article-title a',
  ]);

  // Filter to actual individual recipe pages — exclude collections, categories, and roundups
  const recipeLinks = links.filter((link) => {
    if (!link.includes('/recipes/')) return false;
    const excludePatterns = [
      '/collection/', '/collections/', '/category/', '/categories/',
      '-recipes-', '-recipe-ideas', '-recipe-collection',
      '/recipes/category/', '/recipes/collection/',
    ];
    return !excludePatterns.some((pattern) => link.toLowerCase().includes(pattern));
  });

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
      'h1.heading-1',
      'h1.post-header__title',
      'h1.recipe-header__title',
      'h1',
    ]);
    if (!name) return null;

    const description = trySelectorAttr($, ['meta[name="description"]'], 'content')
      || trySelectors($, ['.editor-content p', '.recipe-description p']);

    // Extract steps
    const steps = trySelectorsAll($, [
      '.method-steps__list-item p',
      '.grouped-list__list-item p',
      '.method-steps__content p',
      '.method li p',
    ], 10);

    // Extract ingredients
    const ingredients = trySelectorsAll($, [
      '.ingredients-list__group li',
      '.recipe-ingredients li',
      '.grouped-list li',
    ], 2);

    // Extract times
    const prepTime = trySelectorAttr($, ['meta[itemprop="prepTime"]'], 'content')
      || trySelectors($, [
        'li.recipe-details__cooking-time-prep span:last-child',
        '.icon-timer + span',
      ]);

    const cookTime = trySelectorAttr($, ['meta[itemprop="cookTime"]'], 'content')
      || trySelectors($, [
        'li.recipe-details__cooking-time-cook span:last-child',
      ]);

    // Extract nutrition (calories + macros)
    let calories = 0;
    let protein = '0g';
    let carbs = '0g';
    let fat = '0g';

    // BBC Good Food nutrition table rows
    const nutritionRows = $('tr.key-value-blocks__batch, .nutrition tr, table.key-value-blocks tr');
    nutritionRows.each((_, row) => {
      const label = $(row).find('td').first().text().toLowerCase().trim();
      const value = $(row).find('td').last().text().trim();
      const numMatch = value.match(/(\d+)/);
      if (!numMatch) return;
      const num = parseInt(numMatch[1]);

      if (label.includes('kcal') || label.includes('calorie') || label.includes('energy')) calories = num;
      else if (label.includes('protein')) protein = `${num}g`;
      else if (label.includes('carb')) carbs = `${num}g`;
      else if (label.includes('fat') && !label.includes('saturate')) fat = `${num}g`;
    });

    // Fallback: single value selectors
    if (calories === 0) {
      const calText = trySelectors($, [
        'td.key-value-blocks__value',
        'tr.nutrition td:nth-child(2)',
      ]);
      const match = calText.match(/(\d+)/);
      if (match) calories = parseInt(match[1]);
    }

    const recipe: Recipe = {
      name,
      description,
      prepTime: parseDuration(prepTime) || 'N/A',
      cookTime: parseDuration(cookTime) || 'N/A',
      ingredients,
      steps: steps.length > 0 ? steps : ['Visit the recipe page for full instructions.'],
      whyItWorks: `A well-tested recipe from ${SITE_NAME}.`,
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

export async function scrapeBBCGoodFood(query: string): Promise<ScraperResult> {
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
