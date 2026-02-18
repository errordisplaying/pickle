export interface RecipeNutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

export interface Recipe {
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  whyItWorks: string;
  nutrition: RecipeNutrition;
  image: string;
  sourceUrl?: string;
  sourceSite?: string;
}

export interface SearchParams {
  ingredients: string;
  timeAvailable?: string;
  cuisine?: string;
  strictness?: string;
}

export interface RecipeResponse {
  recipes: Recipe[];
  source: 'scraped' | 'demo' | 'mixed';
}

export interface ScraperResult {
  recipes: Recipe[];
  siteName: string;
  success: boolean;
  error?: string;
}

export interface AnalyticsEventPayload {
  events: {
    event: string;
    properties: Record<string, any>;
    timestamp: number;
    sessionId: string;
    userId?: string;
  }[];
}
