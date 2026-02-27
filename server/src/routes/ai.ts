import { Router } from 'express';
import type { Request, Response } from 'express';
import { enhanceSearch, generateMealPlan, createRateLimiter } from '../services/aiService.js';
import type { RecipeSummary, NutritionGoals } from '../services/aiService.js';

const router = Router();

// ── Rate Limiters ──────────────────────────────────────────────
const searchLimiter = createRateLimiter(60_000, 10);  // 10/min
const planLimiter = createRateLimiter(60_000, 5);     // 5/min

// ── Input Sanitization ─────────────────────────────────────────
function sanitize(input: string | undefined, maxLen: number): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// ── POST /api/ai/enhance-search ────────────────────────────────
router.post('/enhance-search', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (searchLimiter(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
      return;
    }

    const query = sanitize(req.body?.query, 500);
    if (!query) {
      res.status(400).json({ error: 'Query is required.' });
      return;
    }

    console.log(`[AI] enhance-search: "${query}"`);

    const result = await enhanceSearch(query);

    if (!result) {
      // AI unavailable or failed — return fallback so frontend can proceed
      res.json({ enhanced: false, fallback: query });
      return;
    }

    console.log(`[AI] Enhanced: ingredients="${result.ingredients}", relatedTerms=[${result.relatedTerms.join(', ')}]`);

    res.json({
      enhanced: true,
      ingredients: result.ingredients,
      relatedTerms: result.relatedTerms,
      timeAvailable: result.timeAvailable || null,
      cuisine: result.cuisine || null,
      dietary: result.dietary || [],
      strictness: result.strictness || null,
    });
  } catch (error: any) {
    console.error('[AI] enhance-search error:', error.message);
    res.json({ enhanced: false, fallback: req.body?.query || '' });
  }
});

// ── POST /api/ai/meal-plan ─────────────────────────────────────
router.post('/meal-plan', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (planLimiter(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
      return;
    }

    const preferences = sanitize(req.body?.preferences, 500);
    const nutritionGoals: NutritionGoals = req.body?.nutritionGoals;
    const recipes: RecipeSummary[] = req.body?.recipes;

    // Validate nutrition goals
    if (!nutritionGoals || typeof nutritionGoals.calories !== 'number') {
      res.status(400).json({ error: 'Nutrition goals are required.' });
      return;
    }

    // Validate recipes array
    if (!Array.isArray(recipes) || recipes.length === 0) {
      res.status(400).json({ error: 'At least one recipe is required.' });
      return;
    }

    // Sanitize recipe names and cap array size
    const cleanRecipes: RecipeSummary[] = recipes.slice(0, 50).map(r => ({
      name: sanitize(r.name, 100),
      calories: typeof r.calories === 'number' ? r.calories : 0,
      protein: sanitize(String(r.protein || '0g'), 20),
      carbs: sanitize(String(r.carbs || '0g'), 20),
      fat: sanitize(String(r.fat || '0g'), 20),
      prepTime: sanitize(String(r.prepTime || 'N/A'), 20),
      cookTime: sanitize(String(r.cookTime || 'N/A'), 20),
      tags: Array.isArray(r.tags) ? r.tags.slice(0, 5).map(t => sanitize(String(t), 30)) : [],
    }));

    console.log(`[AI] meal-plan: preferences="${preferences}", ${cleanRecipes.length} recipes, goals=${nutritionGoals.calories}cal`);

    const result = await generateMealPlan(preferences, nutritionGoals, cleanRecipes);

    if (!result) {
      res.status(503).json({ error: 'Could not generate meal plan. Please try again.' });
      return;
    }

    console.log('[AI] Meal plan generated successfully');
    res.json(result);
  } catch (error: any) {
    console.error('[AI] meal-plan error:', error.message);
    res.status(500).json({ error: 'Failed to generate meal plan.' });
  }
});

export default router;
