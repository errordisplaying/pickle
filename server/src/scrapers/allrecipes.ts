import * as cheerio from 'cheerio';
import { fetchPage, extractJsonLd, mapSchemaToRecipe, extractLinks, parseDuration, trySelectors, trySelectorsAll, trySelectorAttr, validateRecipe } from './baseScraper.js';
import type { Recipe, ScraperResult } from '../types/recipe.js';

const SITE_NAME = 'AllRecipes';
const BASE_URL = 'https://www.allrecipes.com';

function buildSearchUrl(query: string): string {
  return `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
}

async function getRecipeLinks(query: string, maxLinks: number = 3): Promise<string[]> {
  const searchUrl = buildSearchUrl(query);
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  // AllRecipes search results: recipe cards link to /recipe/{id}/
  const links = extractLinks($, BASE_URL, [
    'a[href*="/recipe/"]',
    '.mntl-card-list-items a[href*="/recipe/"]',
    '.card__titleLink',
    'a.comp.mntl-card-list-items',
  ]);

  // Filter to actual recipe pages (not category pages, articles, etc.)
  const recipeLinks = links.filter(
    (link) => /\/recipe\/\d+/.test(link) || /allrecipes\.com\/recipe\//.test(link)
  );

  return recipeLinks.slice(0, maxLinks);
}

async function scrapeRecipe(url: string): Promise<Recipe | null> {
  try {
    const html = await fetchPage(url);

    // Try JSON-LD first (most reliable)
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      return mapSchemaToRecipe(jsonLd, url, SITE_NAME);
    }

    // Fallback: parse HTML directly using resilient selector chains
    const $ = cheerio.load(html);

    const name = trySelectors($, [
      'h1.article-heading',
      'h1.headline',
      'h1',
    ]);
    if (!name) return null;

    const description = trySelectors($, [
      'p.article-subheading',
    ]) || trySelectorAttr($, ['meta[name="description"]'], 'content');

    // Extract steps with fallback selectors
    const steps = trySelectorsAll($, [
      'li.mntl-sc-block-group--LI p',
      '.recipe__steps-content p',
      '.instructions-section li p',
    ], 10);

    // Extract ingredients with fallback selectors
    const ingredients = trySelectorsAll($, [
      'li.mntl-structured-ingredients__list-item p',
      '.mntl-structured-ingredients__list-item',
      '.ingredients-section li',
    ], 2);

    // Extract times
    const prepTime = trySelectors($, [
      '.recipe-meta-item:contains("Prep") + *',
      '.mntl-recipe-details__label:contains("Prep") + *',
    ]) || trySelectorAttr($, ['meta[itemprop="prepTime"]'], 'content');

    const cookTime = trySelectors($, [
      '.recipe-meta-item:contains("Cook") + *',
      '.mntl-recipe-details__label:contains("Cook") + *',
    ]) || trySelectorAttr($, ['meta[itemprop="cookTime"]'], 'content');

    // Extract nutrition (calories + macros)
    let calories = 0;
    let protein = '0g';
    let carbs = '0g';
    let fat = '0g';

    // AllRecipes nutrition table rows
    const nutritionRows = $('.mntl-nutrition-facts-label__table-body tr, .nutrition-section tr');
    nutritionRows.each((_, row) => {
      const label = $(row).find('td').first().text().toLowerCase().trim();
      const value = $(row).find('td').last().text().trim();
      const numMatch = value.match(/(\d+)/);
      if (!numMatch) return;
      const num = parseInt(numMatch[1]);

      if (label.includes('calorie')) calories = num;
      else if (label.includes('protein')) protein = `${num}g`;
      else if (label.includes('carb')) carbs = `${num}g`;
      else if (label.includes('fat') && !label.includes('saturated')) fat = `${num}g`;
    });

    // Fallback: try single calorie value
    if (calories === 0) {
      const calText = trySelectors($, [
        '.nutrition-section .mntl-nutrition-facts-label__table-cell:first-child',
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
      whyItWorks: `A popular recipe from ${SITE_NAME}.`,
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

export async function scrapeAllRecipes(query: string): Promise<ScraperResult> {
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
