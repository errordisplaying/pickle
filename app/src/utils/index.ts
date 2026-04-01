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

// ── Ingredient Scaling ──────────────────────────────────────────
const FRACTION_MAP: [number, string][] = [
  [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾'],
];

export const parseFraction = (raw: string): number => {
  // Handle mixed fractions: "1 1/2"
  const mixedMatch = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  // Handle simple fractions: "1/2"
  const fracMatch = raw.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  // Handle decimals / integers
  return parseFloat(raw) || 0;
};

export const formatQuantity = (num: number): string => {
  if (num === 0) return '0';
  const whole = Math.floor(num);
  const frac = num - whole;
  if (frac < 0.05) return String(whole);
  // Try to match a common cooking fraction
  const match = FRACTION_MAP.find(([val]) => Math.abs(frac - val) < 0.05);
  if (match) return whole > 0 ? `${whole} ${match[1]}` : match[1];
  // Fall back to one decimal
  return num % 1 === 0 ? String(num) : num.toFixed(1);
};

export const scaleIngredientText = (ingredient: string, multiplier: number): string => {
  if (multiplier === 1) return ingredient;
  // Match leading quantities: "2 cups", "1/2 tsp", "1 1/2 cups", "0.5 lb"
  const match = ingredient.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*/);
  if (!match) return ingredient;
  const raw = match[1];
  const parsed = parseFraction(raw);
  if (parsed === 0) return ingredient;
  const scaled = parsed * multiplier;
  return ingredient.replace(raw, formatQuantity(scaled));
};

// ── Ingredient Line Parser ──────────────────────────────────────
const UNIT_ALIASES: Record<string, string> = {
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  cup: 'cup', cups: 'cup',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g', g: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  liter: 'l', liters: 'l', l: 'l',
  clove: 'clove', cloves: 'clove',
  can: 'can', cans: 'can',
  bunch: 'bunch', bunches: 'bunch',
  slice: 'slice', slices: 'slice',
  piece: 'piece', pieces: 'piece',
  pinch: 'pinch', dash: 'dash', handful: 'handful',
  sprig: 'sprig', sprigs: 'sprig',
  stalk: 'stalk', stalks: 'stalk',
  head: 'head', heads: 'head',
  package: 'package', packages: 'package', pkg: 'package',
  bag: 'bag', bags: 'bag',
  jar: 'jar', jars: 'jar',
  bottle: 'bottle', bottles: 'bottle',
  stick: 'stick', sticks: 'stick',
  large: 'large', medium: 'medium', small: 'small',
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  a: 1, an: 1,
};

export interface ParsedIngredient {
  quantity?: number;
  unit?: string;
  name: string;
}

export const parseIngredientLine = (line: string): ParsedIngredient => {
  const trimmed = line.trim();
  if (!trimmed) return { name: trimmed };

  // Try to match leading quantity: "2", "1/2", "1 1/2", "0.5", unicode fractions
  let remaining = trimmed;
  let quantity: number | undefined;

  // Unicode fraction characters
  const unicodeFracs: Record<string, number> = { '¼': 0.25, '⅓': 0.333, '½': 0.5, '⅔': 0.667, '¾': 0.75 };
  const unicodeMatch = remaining.match(/^(\d+)?\s*([¼⅓½⅔¾])\s*/);
  if (unicodeMatch) {
    const whole = unicodeMatch[1] ? parseInt(unicodeMatch[1]) : 0;
    quantity = whole + (unicodeFracs[unicodeMatch[2]] || 0);
    remaining = remaining.slice(unicodeMatch[0].length);
  } else {
    // Numeric: "1 1/2", "1/2", "2-3", "2.5", or word numbers
    const numMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*(?:[-–]\s*\d+\.?\d*)?\s*/);
    if (numMatch) {
      // For ranges like "2-3", take the first number
      const raw = numMatch[1];
      quantity = parseFraction(raw);
      if (quantity === 0) quantity = undefined;
      remaining = remaining.slice(numMatch[0].length);
    } else {
      // Word numbers: "one onion", "a clove"
      const wordMatch = remaining.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an?)\b\s*/i);
      if (wordMatch) {
        quantity = WORD_NUMBERS[wordMatch[1].toLowerCase()];
        remaining = remaining.slice(wordMatch[0].length);
      }
    }
  }

  // Try to match a unit
  let unit: string | undefined;
  if (quantity !== undefined) {
    const unitMatch = remaining.match(/^([a-zA-Z]+)\.?\s+/);
    if (unitMatch) {
      const normalized = UNIT_ALIASES[unitMatch[1].toLowerCase()];
      if (normalized) {
        unit = normalized;
        remaining = remaining.slice(unitMatch[0].length);
      }
    }
  }

  // Clean up remaining name
  const name = remaining.replace(/^(of\s+)/i, '').trim() || trimmed;

  return { quantity, unit, name };
};

// ── Time Extraction ─────────────────────────────────────────────
export const extractTimeFromStep = (stepText: string): number | null => {
  const regex = /(\d+)(?:\s*[-–]\s*\d+)?\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)/gi;
  const match = regex.exec(stepText);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('hour') || unit.startsWith('hr')) return value * 3600;
  if (unit.startsWith('min')) return value * 60;
  if (unit.startsWith('sec')) return value;
  return null;
};

// ── Dietary Filter Matching ─────────────────────────────────────
export const DIETARY_FILTER_TAG_MAP: Record<string, string[]> = {
  'Vegan': ['Vegan'],
  'Vegetarian': ['Vegetarian', 'Vegan'],
  'Gluten-Free': ['Gluten-Free', 'Keto'],
  'Dairy-Free': ['Dairy-Free', 'Vegan'],
  'Keto': ['Keto'],
  'Nut-Free': ['Nut-Free'],
  'Kosher': ['Kosher'],
  'Halal': ['Halal'],
};

export const recipeMatchesDietaryFilters = (
  recipe: { tags: string[] },
  activeFilters: string[]
): boolean => {
  if (activeFilters.length === 0) return true;
  return activeFilters.every(filter => {
    const compatibleTags = DIETARY_FILTER_TAG_MAP[filter] || [filter];
    return recipe.tags.some(tag => compatibleTags.includes(tag));
  });
};

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
          const parsed = parseIngredientLine(ingredientLine);

          // Find matching category keyword for this ingredient
          const matchedKeyword = ingredientKeywords.find(kw => lower.includes(kw));
          const category = matchedKeyword
            ? INGREDIENT_CATEGORIES[matchedKeyword]
            : categorizeIngredient(ingredientLine);

          // Deduplicate by matched keyword or cleaned name
          const key = matchedKeyword || parsed.name.toLowerCase().replace(/[\d.\/]+/g, '').trim();

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            if (!existing.fromRecipes.includes(recipe.name)) {
              existing.fromRecipes.push(recipe.name);
            }
            // Sum quantities if same unit (or both unitless)
            if (existing.quantity !== undefined && parsed.quantity !== undefined && existing.unit === parsed.unit) {
              existing.quantity += parsed.quantity;
            }
          } else {
            ingredientMap.set(key, {
              id: `shop-${key.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: parsed.name,
              category,
              purchased: false,
              fromRecipes: [recipe.name],
              quantity: parsed.quantity,
              unit: parsed.unit,
              rawLine: ingredientLine.trim(),
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

// ── Recipe Share Card (Canvas) ─────────────────────────────────────
// Generates a branded 1200×630 PNG image for social sharing

/** Wrap text to fit within a max width, returning lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Load an image from a URL, resolving with the loaded Image element */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

export async function generateRecipeCard(recipe: {
  name: string;
  image?: string;
  prepTime?: string;
  cookTime?: string;
  nutrition?: { calories: number; protein: string; carbs: string; fat: string };
  ingredients?: string[];
}): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background
  ctx.fillStyle = '#F7F3EB';
  ctx.fillRect(0, 0, W, H);

  // ── Left image area (40%)
  const imgW = Math.round(W * 0.4);
  let hasImage = false;

  if (recipe.image) {
    try {
      const img = await loadImage(recipe.image);
      // Cover-crop the image into the left area
      const scale = Math.max(imgW / img.width, H / img.height);
      const sw = imgW / scale;
      const sh = H / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, imgW, H);
      hasImage = true;
    } catch {
      // Fall through to placeholder
    }
  }

  if (!hasImage) {
    ctx.fillStyle = '#E8E6DC';
    ctx.fillRect(0, 0, imgW, H);
    // Utensil placeholder icon
    ctx.font = '80px serif';
    ctx.fillStyle = '#C49A5C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍽', imgW / 2, H / 2);
  }

  // ── Right content area (60%)
  const contentX = imgW + 48;
  const contentW = W - imgW - 96;
  let y = 60;

  // Recipe name
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
  const nameLines = wrapText(ctx, toTitleCase(recipe.name), contentW);
  for (const line of nameLines.slice(0, 3)) {
    ctx.fillText(line, contentX, y);
    y += 52;
  }

  // Divider
  y += 12;
  ctx.strokeStyle = '#C49A5C';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(contentX, y);
  ctx.lineTo(contentX + contentW, y);
  ctx.stroke();
  y += 24;

  // Time + calories row
  ctx.font = '22px -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#6E6A60';
  const infoParts: string[] = [];
  if (recipe.prepTime && recipe.prepTime !== 'N/A') infoParts.push(`⏱ Prep: ${recipe.prepTime}`);
  if (recipe.cookTime && recipe.cookTime !== 'N/A') infoParts.push(`🔥 Cook: ${recipe.cookTime}`);
  if (recipe.nutrition && recipe.nutrition.calories > 0) infoParts.push(`${recipe.nutrition.calories} cal`);
  if (infoParts.length > 0) {
    ctx.fillText(infoParts.join('   •   '), contentX, y);
    y += 36;
  }

  // Macros row
  if (recipe.nutrition && recipe.nutrition.calories > 0) {
    ctx.font = '20px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#6E6A60';
    const macros = `P: ${recipe.nutrition.protein}  •  C: ${recipe.nutrition.carbs}  •  F: ${recipe.nutrition.fat}`;
    ctx.fillText(macros, contentX, y);
    y += 36;
  }

  // Ingredients (up to 5)
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    y += 8;
    ctx.font = '20px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#6E6A60';
    const display = recipe.ingredients.slice(0, 5);
    for (const ing of display) {
      const trimmed = ing.length > 45 ? ing.slice(0, 42) + '...' : ing;
      ctx.fillText(`•  ${trimmed}`, contentX, y);
      y += 30;
    }
    if (recipe.ingredients.length > 5) {
      ctx.fillStyle = '#6E6A60';
      ctx.fillText(`  + ${recipe.ingredients.length - 5} more`, contentX, y);
    }
  }

  // ── Bottom bar
  const barH = 48;
  ctx.fillStyle = '#C49A5C';
  ctx.fillRect(0, H - barH, W, barH);

  ctx.font = 'bold 18px -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('chickpea.kitchen', W / 2, H - barH / 2);

  // ── Export as blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png'
    );
  });
}
