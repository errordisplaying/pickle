import type { SavedRecipe, PlannerWeek, RecipeNutrition, ShoppingItem, IngredientCategory } from '@/types';
import { INGREDIENT_CATEGORIES, categorizeIngredient } from '@/constants';
import { demoRecipes, suggestedRecipes } from '@/data';

// ── localStorage Utilities ───────────────────────────────────────
export const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
};

// ── Recipe Normalizers ───────────────────────────────────────────
export const generateRecipeId = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

export const normalizeScrapedRecipe = (recipe: any, source: 'scraped' | 'demo'): SavedRecipe => ({
  id: generateRecipeId(recipe.name),
  name: recipe.name || '',
  description: recipe.description || '',
  prepTime: recipe.prepTime || 'N/A',
  cookTime: recipe.cookTime || 'N/A',
  totalTime: recipe.prepTime && recipe.prepTime !== 'N/A' && recipe.cookTime && recipe.cookTime !== 'N/A'
    ? `${(parseInt(recipe.prepTime) || 0) + (parseInt(recipe.cookTime) || 0)} min`
    : recipe.prepTime !== 'N/A' ? recipe.prepTime : recipe.cookTime !== 'N/A' ? recipe.cookTime : 'N/A',
  ingredients: recipe.ingredients || [],
  steps: recipe.steps || [],
  whyItWorks: recipe.whyItWorks || '',
  nutrition: recipe.nutrition || { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
  image: recipe.image || '',
  sourceUrl: recipe.sourceUrl,
  sourceSite: recipe.sourceSite,
  tags: [],
  difficulty: 'Medium',
  savedAt: Date.now(),
  source,
});

// Build a lookup map from demo recipes for enriching gallery recipes
const demoRecipeLookup = new Map<string, any>();
Object.values(demoRecipes).flat().forEach(r => {
  demoRecipeLookup.set(r.name.toLowerCase(), r);
});

export const normalizeGalleryRecipe = (recipe: any): SavedRecipe => {
  // Cross-reference with demo recipes for richer data (steps, ingredients, description)
  const demoMatch = demoRecipeLookup.get(recipe.name.toLowerCase())
    || demoRecipeLookup.get(recipe.name.toLowerCase().replace(' bowl', ' veggie bowl'));

  return {
    id: generateRecipeId(recipe.name),
    name: recipe.name || '',
    description: demoMatch?.description || '',
    prepTime: recipe.time || 'N/A',
    cookTime: demoMatch?.cookTime || 'N/A',
    totalTime: recipe.time || 'N/A',
    ingredients: demoMatch?.ingredients || [],
    steps: demoMatch?.steps || [],
    whyItWorks: demoMatch?.whyItWorks || '',
    nutrition: {
      calories: recipe.calories || 0,
      protein: recipe.protein || '0g',
      carbs: recipe.carbs || '0g',
      fat: recipe.fat || '0g',
    },
    image: recipe.image || '',
    tags: recipe.tags || [],
    difficulty: recipe.difficulty || 'Easy',
    savedAt: Date.now(),
    source: 'gallery',
  };
};

// ── Browse Recipes (merged demo + suggested, deduplicated) ──────

const DEMO_CATEGORY_TAGS: Record<string, string> = {
  chicken: 'Chicken',
  beef: 'Beef',
  vegetarian: 'Vegetarian',
  seafood: 'Seafood',
  pasta: 'Pasta',
  quick: 'Quick',
};

let _browseRecipesCache: SavedRecipe[] | null = null;

export const getAllBrowseRecipes = (): SavedRecipe[] => {
  if (_browseRecipesCache) return _browseRecipesCache;

  const seen = new Set<string>();
  const recipes: SavedRecipe[] = [];

  // 1. Flatten demo recipes (richest data — ingredients, steps, description)
  for (const [category, items] of Object.entries(demoRecipes)) {
    for (const r of items as any[]) {
      const key = r.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const totalTime = r.prepTime && r.cookTime
        ? `${(parseInt(r.prepTime) || 0) + (parseInt(r.cookTime) || 0)} min`
        : r.prepTime || r.cookTime || 'N/A';
      recipes.push({
        id: generateRecipeId(r.name),
        name: r.name,
        description: r.description || '',
        prepTime: r.prepTime || 'N/A',
        cookTime: r.cookTime || 'N/A',
        totalTime,
        ingredients: r.ingredients || [],
        steps: r.steps || [],
        whyItWorks: r.whyItWorks || '',
        nutrition: r.nutrition || { calories: 0, protein: '0g', carbs: '0g', fat: '0g' },
        image: r.image || '',
        tags: [DEMO_CATEGORY_TAGS[category] || category].filter(Boolean),
        difficulty: r.difficulty || 'Medium',
        savedAt: Date.now(),
        source: 'demo',
      });
    }
  }

  // 2. Add suggested recipes (gallery-style) — skip duplicates
  for (const r of suggestedRecipes) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipes.push(normalizeGalleryRecipe(r));
  }

  _browseRecipesCache = recipes;
  return recipes;
};

export const BROWSE_TAGS = ['All', 'Quick', 'Chicken', 'Beef', 'Seafood', 'Pasta', 'Vegetarian', 'Healthy', 'Comfort', 'Asian'] as const;

// ── Planner Helpers ──────────────────────────────────────────────
export const defaultPlannerWeek: PlannerWeek = {
  Mon: { breakfast: null, lunch: null, dinner: null },
  Tue: { breakfast: null, lunch: null, dinner: null },
  Wed: { breakfast: null, lunch: null, dinner: null },
  Thu: { breakfast: null, lunch: null, dinner: null },
  Fri: { breakfast: null, lunch: null, dinner: null },
  Sat: { breakfast: null, lunch: null, dinner: null },
  Sun: { breakfast: null, lunch: null, dinner: null },
};

export const migratePlannerData = (data: any): PlannerWeek => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const result: PlannerWeek = {};
  days.forEach(day => {
    if (!data[day]) {
      result[day] = { breakfast: null, lunch: null, dinner: null };
    } else {
      result[day] = {
        breakfast: typeof data[day].breakfast === 'string' ? null : data[day].breakfast,
        lunch: typeof data[day].lunch === 'string' ? null : data[day].lunch,
        dinner: typeof data[day].dinner === 'string' ? null : data[day].dinner,
      };
    }
  });
  return result;
};

// ── Nutrition Helpers ────────────────────────────────────────────
export const parseNutritionValue = (val: string): number =>
  parseFloat(val.replace(/[^\d.]/g, '')) || 0;

export const scaleNutrition = (nutrition: RecipeNutrition, multiplier: number): RecipeNutrition => ({
  calories: Math.round(nutrition.calories * multiplier),
  protein: `${Math.round(parseNutritionValue(nutrition.protein) * multiplier)}g`,
  carbs: `${Math.round(parseNutritionValue(nutrition.carbs) * multiplier)}g`,
  fat: `${Math.round(parseNutritionValue(nutrition.fat) * multiplier)}g`,
});

export const getNutritionProgressColor = (current: number, goal: number): string => {
  if (goal === 0) return 'bg-[#E8E6DC]';
  const ratio = current / goal;
  if (ratio <= 0.85) return 'bg-emerald-500';
  if (ratio <= 1.0) return 'bg-amber-500';
  return 'bg-red-500';
};

export const getNutritionProgressPct = (current: number, goal: number): number =>
  goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;

export const getDayNutrition = (plannerMeals: PlannerWeek, day: string): RecipeNutrition => {
  const dayMeals = plannerMeals[day];
  if (!dayMeals) return { calories: 0, protein: '0g', carbs: '0g', fat: '0g' };
  const meals = [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner].filter(Boolean) as SavedRecipe[];
  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.nutrition.calories || 0),
    protein: acc.protein + parseNutritionValue(meal.nutrition.protein),
    carbs: acc.carbs + parseNutritionValue(meal.nutrition.carbs),
    fat: acc.fat + parseNutritionValue(meal.nutrition.fat),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return {
    calories: totals.calories,
    protein: `${Math.round(totals.protein)}g`,
    carbs: `${Math.round(totals.carbs)}g`,
    fat: `${Math.round(totals.fat)}g`,
  };
};

export const getWeeklyNutrition = (plannerMeals: PlannerWeek) => {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].reduce((acc, day) => {
    const dayNutr = getDayNutrition(plannerMeals, day);
    return {
      calories: acc.calories + dayNutr.calories,
      protein: acc.protein + parseNutritionValue(dayNutr.protein),
      carbs: acc.carbs + parseNutritionValue(dayNutr.carbs),
      fat: acc.fat + parseNutritionValue(dayNutr.fat),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
};

// ── Text Helpers ─────────────────────────────────────────────────
export const toTitleCase = (str: string) => {
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'in', 'of', 'with', 'by', 'de', 'vs']);
  return str
    .split(' ')
    .map((word, i) => {
      if (!word) return word;
      if (i === 0 || !minorWords.has(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.toLowerCase();
    })
    .join(' ');
};

// ── Recipe Sharing ───────────────────────────────────────────────
export const formatRecipeShareText = (recipe: any): string => {
  const lines: string[] = [toTitleCase(recipe.name || '')];
  if (recipe.description) lines.push(recipe.description);
  lines.push('');
  if (recipe.nutrition?.calories > 0) {
    lines.push(`Nutrition: ${recipe.nutrition.calories} cal | P: ${recipe.nutrition.protein} | C: ${recipe.nutrition.carbs} | F: ${recipe.nutrition.fat}`);
  }
  if (recipe.sourceUrl) lines.push(`Recipe: ${recipe.sourceUrl}`);
  lines.push('', 'Shared via chickpea');
  return lines.join('\n');
};

// ── Google Calendar URL ──────────────────────────────────────────
export const generateGoogleCalendarUrl = (
  recipe: SavedRecipe,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dayOfWeek: string
): string => {
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  const targetDay = dayMap[dayOfWeek] ?? 1;
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const eventDate = new Date(today);
  eventDate.setDate(today.getDate() + daysUntil);

  const startHours = mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 12 : 18;
  eventDate.setHours(startHours, 0, 0, 0);

  let durationMinutes = 60;
  if (recipe.totalTime && recipe.totalTime !== 'N/A') {
    const mins = parseInt(recipe.totalTime);
    if (!isNaN(mins) && mins > 0) durationMinutes = mins;
  }

  const endDate = new Date(eventDate.getTime() + durationMinutes * 60000);

  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  const title = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} \u2014 ${toTitleCase(recipe.name)}`;

  const descParts: string[] = [];
  if (recipe.nutrition.calories > 0) {
    descParts.push(`Nutrition: ${recipe.nutrition.calories} cal | P: ${recipe.nutrition.protein} | C: ${recipe.nutrition.carbs} | F: ${recipe.nutrition.fat}`);
  }
  if (recipe.totalTime && recipe.totalTime !== 'N/A') {
    descParts.push(`Cook time: ${recipe.totalTime}`);
  }
  if (recipe.steps.length > 0) {
    descParts.push('Steps:\n' + recipe.steps.slice(0, 10).map((s, i) => `${i + 1}. ${s}`).join('\n'));
  }
  if (recipe.sourceUrl) {
    descParts.push(`Recipe: ${recipe.sourceUrl}`);
  }
  descParts.push('Planned with chickpea');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(eventDate)}/${fmt(endDate)}`,
    details: descParts.join('\n\n'),
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

// ── Shopping List Helpers ────────────────────────────────────────
export const extractIngredientsFromPlanner = (plannerMeals: PlannerWeek): ShoppingItem[] => {
  const ingredientMap = new Map<string, ShoppingItem>();
  const ingredientKeywords = Object.keys(INGREDIENT_CATEGORIES);

  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
    const dayMeals = plannerMeals[day];
    if (!dayMeals) return;
    (['breakfast', 'lunch', 'dinner'] as const).forEach(slot => {
      const recipe = dayMeals[slot];
      if (!recipe) return;

      // PRIMARY: Use structured ingredients array when available
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ingredientLine => {
          const lower = ingredientLine.toLowerCase();

          // Find matching category keyword for this ingredient
          const matchedKeyword = ingredientKeywords.find(kw => lower.includes(kw));
          const category = matchedKeyword
            ? INGREDIENT_CATEGORIES[matchedKeyword]
            : categorizeIngredient(ingredientLine);

          // Deduplicate by matched keyword or cleaned name
          const key = matchedKeyword || lower.replace(/[\d.\/]+/g, '').trim();

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            if (!existing.fromRecipes.includes(recipe.name)) {
              existing.fromRecipes.push(recipe.name);
            }
          } else {
            ingredientMap.set(key, {
              id: `shop-${key.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: ingredientLine.trim(),
              category,
              purchased: false,
              fromRecipes: [recipe.name],
            });
          }
        });
      } else {
        // FALLBACK: Keyword scan for recipes without an ingredients array
        const recipeText = [recipe.name, recipe.description, ...recipe.steps].join(' ').toLowerCase();
        ingredientKeywords.forEach(ingredient => {
          if (recipeText.includes(ingredient)) {
            const key = ingredient.toLowerCase();
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key)!;
              if (!existing.fromRecipes.includes(recipe.name)) {
                existing.fromRecipes.push(recipe.name);
              }
            } else {
              ingredientMap.set(key, {
                id: `shop-${key.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: ingredient.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                category: categorizeIngredient(ingredient),
                purchased: false,
                fromRecipes: [recipe.name],
              });
            }
          }
        });
      }
    });
  });

  const catOrder: IngredientCategory[] = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Spices', 'Other'];
  return Array.from(ingredientMap.values()).sort((a, b) =>
    catOrder.indexOf(a.category) - catOrder.indexOf(b.category)
  );
};
