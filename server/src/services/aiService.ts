import OpenAI from 'openai';

// ── Shared OpenAI Client (lazy singleton) ───────────────────────
let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// ── Rate Limiter Factory ────────────────────────────────────────
interface RateBucket {
  timestamps: number[];
}

export function createRateLimiter(windowMs: number, max: number) {
  const buckets = new Map<string, RateBucket>();

  // Cleanup stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
      if (bucket.timestamps.length === 0) buckets.delete(ip);
    }
  }, 5 * 60_000);

  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(ip, bucket);
    }
    bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
    if (bucket.timestamps.length >= max) return true;
    bucket.timestamps.push(now);
    return false;
  };
}

// ── Input Sanitization ──────────────────────────────────────────
function sanitize(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// ── Feature 1+2: Enhance Search ────────────────────────────────
export interface EnhancedSearchResult {
  ingredients: string;
  relatedTerms: string[];
  timeAvailable?: string;
  cuisine?: string;
  dietary?: string[];
  strictness?: string;
}

const ENHANCE_SEARCH_SYSTEM = `You are a recipe search assistant. Given a user's cooking query (which may be natural language or a simple ingredient list), extract structured search parameters.

Return a JSON object with:
- "ingredients": comma-separated primary ingredients to search for (extract concrete ingredients from vague queries, e.g., "something healthy" → "salad, grilled chicken, quinoa")
- "relatedTerms": array of ingredient synonyms, related items, and sub-categories that would help match recipes (e.g., "chicken" → ["poultry", "chicken breast", "chicken thigh", "hen"], "greens" → ["spinach", "kale", "arugula", "lettuce", "chard"])
- "timeAvailable": time constraint in minutes as a string (e.g., "30") if mentioned, or null
- "cuisine": cuisine type if mentioned (e.g., "Italian", "Asian"), or null
- "dietary": array of dietary preferences if mentioned (e.g., ["vegan", "gluten-free"]), or empty array
- "strictness": "strict" if user wants exact ingredient matches, "flexible" if open to suggestions, or null

Only return valid JSON. No additional text.`;

export async function enhanceSearch(query: string): Promise<EnhancedSearchResult | null> {
  const client = getOpenAI();
  if (!client) return null;

  const clean = sanitize(query, 500);
  if (!clean) return null;

  try {
    const result = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 250,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ENHANCE_SEARCH_SYSTEM },
          { role: 'user', content: clean },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), 4000)
      ),
    ]);

    const content = result.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      ingredients: typeof parsed.ingredients === 'string' ? parsed.ingredients : clean,
      relatedTerms: Array.isArray(parsed.relatedTerms)
        ? parsed.relatedTerms.filter((t: any) => typeof t === 'string').slice(0, 20)
        : [],
      timeAvailable: typeof parsed.timeAvailable === 'string' ? parsed.timeAvailable : undefined,
      cuisine: typeof parsed.cuisine === 'string' ? parsed.cuisine : undefined,
      dietary: Array.isArray(parsed.dietary)
        ? parsed.dietary.filter((d: any) => typeof d === 'string')
        : undefined,
      strictness: parsed.strictness === 'strict' || parsed.strictness === 'flexible'
        ? parsed.strictness
        : undefined,
    };
  } catch (error: any) {
    console.warn('[AI] enhanceSearch failed:', error.message);
    return null;
  }
}

// ── Feature 3: Generate Meal Plan ──────────────────────────────
export interface RecipeSummary {
  name: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  prepTime: string;
  cookTime: string;
  tags: string[];
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanResult {
  plan: Record<string, {
    breakfast: string | null;
    lunch: string | null;
    dinner: string | null;
  }>;
}

const MEAL_PLAN_SYSTEM = `You are a meal planning assistant. Given a list of available recipes with their nutrition data, the user's preferences, and daily nutrition goals, create an optimal 7-day meal plan.

Rules:
1. ONLY use recipes from the provided list. Use EXACT recipe names as given.
2. Try to hit the daily nutrition goals (calories, protein, carbs, fat) as closely as possible each day by combining breakfast + lunch + dinner.
3. Minimize repetition — each recipe should appear at most 2-3 times across the entire week.
4. Respect the user's dietary preferences and constraints.
5. Vary cuisines and ingredients throughout the week for an enjoyable eating experience.
6. It's okay to leave a slot as null if no good recipe fits.
7. Consider prep/cook time — lighter, quicker recipes for breakfast, heartier meals for dinner.

Return a JSON object with this exact structure:
{
  "plan": {
    "Mon": { "breakfast": "Exact Recipe Name" or null, "lunch": "Exact Recipe Name" or null, "dinner": "Exact Recipe Name" or null },
    "Tue": { "breakfast": ..., "lunch": ..., "dinner": ... },
    "Wed": { "breakfast": ..., "lunch": ..., "dinner": ... },
    "Thu": { "breakfast": ..., "lunch": ..., "dinner": ... },
    "Fri": { "breakfast": ..., "lunch": ..., "dinner": ... },
    "Sat": { "breakfast": ..., "lunch": ..., "dinner": ... },
    "Sun": { "breakfast": ..., "lunch": ..., "dinner": ... }
  }
}

Only return valid JSON. No additional text.`;

export async function generateMealPlan(
  preferences: string,
  nutritionGoals: NutritionGoals,
  recipes: RecipeSummary[]
): Promise<MealPlanResult | null> {
  const client = getOpenAI();
  if (!client) return null;

  const cleanPrefs = sanitize(preferences, 500);

  // Build compact recipe list for the prompt
  const recipeList = recipes
    .slice(0, 50) // cap at 50 to keep token usage manageable
    .map(r => `• ${r.name} (${r.calories} cal, P:${r.protein}, C:${r.carbs}, F:${r.fat}, prep:${r.prepTime}, cook:${r.cookTime}, tags:${r.tags.join(',')})`)
    .join('\n');

  const userMessage = `User preferences: ${cleanPrefs || 'No specific preferences'}

Daily nutrition goals: ${nutritionGoals.calories} calories, ${nutritionGoals.protein}g protein, ${nutritionGoals.carbs}g carbs, ${nutritionGoals.fat}g fat

Available recipes:
${recipeList}`;

  try {
    const result = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 700,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: MEAL_PLAN_SYSTEM },
          { role: 'user', content: userMessage },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), 15000)
      ),
    ]);

    const content = result.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.plan || typeof parsed.plan !== 'object') return null;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const plan: MealPlanResult['plan'] = {};

    for (const day of days) {
      const dayPlan = parsed.plan[day];
      if (!dayPlan || typeof dayPlan !== 'object') {
        plan[day] = { breakfast: null, lunch: null, dinner: null };
        continue;
      }
      plan[day] = {
        breakfast: typeof dayPlan.breakfast === 'string' ? dayPlan.breakfast : null,
        lunch: typeof dayPlan.lunch === 'string' ? dayPlan.lunch : null,
        dinner: typeof dayPlan.dinner === 'string' ? dayPlan.dinner : null,
      };
    }

    return { plan };
  } catch (error: any) {
    console.error('[AI] generateMealPlan failed:', error.message);
    return null;
  }
}
