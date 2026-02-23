import type { DietaryFilter, NutritionGoals, IngredientCategory } from '@/types';

export const DIETARY_FILTERS: DietaryFilter[] = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Nut-Free', 'Kosher', 'Halal'];
export const SERVING_MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4];

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

export const STORAGE_KEYS = {
  FAVORITES: 'souschef_favorites',
  PLANNER: 'souschef_planner',
  RECENT_RECIPES: 'souschef_recent',
  NUTRITION_GOALS: 'souschef_nutrition_goals',
  SHOPPING_LIST: 'souschef_shopping_list',
  TASTE_PROFILE: 'souschef_taste_profile',
  ANALYTICS_SESSION: 'souschef_analytics_session',
};

export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  onion: 'Produce', garlic: 'Produce', tomato: 'Produce', potato: 'Produce',
  carrot: 'Produce', broccoli: 'Produce', spinach: 'Produce', lettuce: 'Produce',
  pepper: 'Produce', 'bell pepper': 'Produce', zucchini: 'Produce', cucumber: 'Produce',
  lemon: 'Produce', lime: 'Produce', avocado: 'Produce', mushroom: 'Produce',
  'green onion': 'Produce', ginger: 'Produce', cilantro: 'Produce', parsley: 'Produce',
  basil: 'Produce', celery: 'Produce', kale: 'Produce', cabbage: 'Produce',
  corn: 'Produce', asparagus: 'Produce', cauliflower: 'Produce', peas: 'Produce',
  scallion: 'Produce', jalapeño: 'Produce', chili: 'Produce',
  milk: 'Dairy', cheese: 'Dairy', butter: 'Dairy', cream: 'Dairy',
  yogurt: 'Dairy', parmesan: 'Dairy', pecorino: 'Dairy', feta: 'Dairy',
  egg: 'Dairy', eggs: 'Dairy', 'heavy cream': 'Dairy', 'sour cream': 'Dairy',
  mozzarella: 'Dairy', cheddar: 'Dairy', 'cream cheese': 'Dairy',
  chicken: 'Protein', beef: 'Protein', shrimp: 'Protein', salmon: 'Protein',
  fish: 'Protein', pork: 'Protein', tofu: 'Protein', pancetta: 'Protein',
  bacon: 'Protein', turkey: 'Protein', lamb: 'Protein', sausage: 'Protein',
  chickpeas: 'Protein', 'black beans': 'Protein', lentils: 'Protein', tempeh: 'Protein',
  rice: 'Pantry', pasta: 'Pantry', spaghetti: 'Pantry', noodles: 'Pantry',
  bread: 'Pantry', flour: 'Pantry', breadcrumbs: 'Pantry', 'olive oil': 'Pantry',
  oil: 'Pantry', 'soy sauce': 'Pantry', 'sesame oil': 'Pantry', vinegar: 'Pantry',
  cornstarch: 'Pantry', quinoa: 'Pantry', oats: 'Pantry', sugar: 'Pantry',
  honey: 'Pantry', broth: 'Pantry', stock: 'Pantry', 'coconut milk': 'Pantry',
  'tomato paste': 'Pantry', 'tomato sauce': 'Pantry',
  salt: 'Spices', cumin: 'Spices', paprika: 'Spices',
  oregano: 'Spices', thyme: 'Spices', rosemary: 'Spices', cinnamon: 'Spices',
  'chili flakes': 'Spices', 'red pepper flakes': 'Spices', turmeric: 'Spices',
  'black pepper': 'Spices', cayenne: 'Spices', nutmeg: 'Spices', 'curry powder': 'Spices',
};

export const categorizeIngredient = (ingredient: string): IngredientCategory => {
  const lower = ingredient.toLowerCase();
  for (const [keyword, category] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (lower.includes(keyword)) return category;
  }
  return 'Other';
};
