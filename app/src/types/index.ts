export interface RecipeNutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

export interface SavedRecipe {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  ingredients: string[];
  steps: string[];
  whyItWorks: string;
  nutrition: RecipeNutrition;
  image: string;
  sourceUrl?: string;
  sourceSite?: string;
  tags: string[];
  difficulty: string;
  savedAt: number;
  source: 'scraped' | 'demo' | 'gallery' | 'manual';
  rating?: number;
  personalNotes?: string;
}

export interface PlannerDay {
  breakfast: SavedRecipe | null;
  lunch: SavedRecipe | null;
  dinner: SavedRecipe | null;
}

export type PlannerWeek = Record<string, PlannerDay>;

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export type DietaryFilter = 'Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Dairy-Free' | 'Keto' | 'Nut-Free' | 'Kosher' | 'Halal';

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type IngredientCategory = 'Produce' | 'Dairy' | 'Protein' | 'Pantry' | 'Spices' | 'Other';

export interface ShoppingItem {
  id: string;
  name: string;
  category: IngredientCategory;
  purchased: boolean;
  fromRecipes: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserTasteProfile {
  preferredTags: Record<string, number>;
  preferredDifficulty: Record<string, number>;
  calorieRange: { min: number; max: number };
  proteinPreference: 'low' | 'moderate' | 'high';
  lastUpdated: number;
}

export interface ScoredRecipe {
  recipe: any;
  normalized: SavedRecipe;
  score: number;
  reason: string;
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

// ── SmartSwap Types ──────────────────────────────────────────────

export interface SmartSwap {
  original: string;
  swap: string;
  category: string;
  note: string;
  ratio: string;
}

export interface CommunitySwap extends SmartSwap {
  id: string;
  user_id: string;
  display_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  upvotes: number;
}

export interface SwapSuggestionForm {
  original: string;
  swap: string;
  category: string;
  note: string;
  ratio: string;
}

// ── Test Kitchen Types ───────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
