import * as cheerio from 'cheerio';
import { fetchPage, extractJsonLd, mapSchemaToRecipe, extractLinks, parseDuration, trySelectors, trySelectorsAll, trySelectorAttr, validateRecipe } from './baseScraper.js';
import type { Recipe, ScraperResult } from '../types/recipe.js';

const SITE_NAME = 'Food Network';
const BASE_URL = 'https://www.foodnetwork.com';

function buildSearchUrl(query: string): string {
  return `${BASE_URL}/search/${encodeURIComponent(query.replace(/\s+/g, '-'))}-`;
}

async function getRecipeLinks(query: string, maxLinks: number = 3): Promise<string[]> {
  const searchUrl = buildSearchUrl(query);
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const links = extractLinks($, BASE_URL, [
    'a[href*="/recipes/"]',
    '.o-ResultCard a',
    '.m-MediaBlock__a-Headline a',
  ]);

  // Filter to recipe pages only (contain /recipes/ in path)
  const recipeLinks = links.filter(
    (link) => link.includes('/recipes/') && !link.includes('/photos/') && !link.includes('/videos/')
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
      'h1.o-AssetTitle__a-HeadlineText',
      'span.o-AssetTitle__a-HeadlineText',
      'h1',
    ]);
    if (!name) return null;

    const description = trySelectorAttr($, ['meta[name="description"]'], 'content')
      || trySelectors($, ['.o-AssetDescription__a-Description']);

    // Extract steps
    const steps = trySelectorsAll($, [
      '.o-Method__m-Step p',
      '.o-Method__m-Body p',
      '.recipe-procedure li p',
    ], 10);

    // Extract ingredients
    const ingredients = trySelectorsAll($, [
      '.o-Ingredients__a-Ingredient',
      '.o-Ingredients__a-ListItemText',
      '.ingredient-list li',
    ], 2);

    // Extract times
    const prepTime = trySelectorAttr($, ['meta[itemprop="prepTime"]'], 'content')
      || trySelectors($, [
        '.o-RecipeInfo__m-Time .o-RecipeInfo__a-Description:first-of-type',
      ]);

    const cookTime = trySelectorAttr($, ['meta[itemprop="cookTime"]'], 'content')
      || trySelectors($, [
        '.o-RecipeInfo__m-Time .o-RecipeInfo__a-Description:last-of-type',
      ]);

    // Extract nutrition (calories + macros)
    let calories = 0;
    let protein = '0g';
    let carbs = '0g';
    let fat = '0g';

    // Food Network nutrition info section
    const nutritionRows = $('.o-NutritionInfo__m-Row, .o-NutritionInfo li, .nutrition-body tr');
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
      prepTime: parseDuration(prepTime) || 'N/A',
      cookTime: parseDuration(cookTime) || 'N/A',
      ingredients,
      steps: steps.length > 0 ? steps : ['Visit the recipe page for full instructions.'],
      whyItWorks: `A professionally tested recipe from ${SITE_NAME}.`,
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

export async function scrapeFoodNetwork(query: string): Promise<ScraperResult> {
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
