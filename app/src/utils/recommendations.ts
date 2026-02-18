import type { SavedRecipe, PlannerWeek, UserTasteProfile, ScoredRecipe, NutritionGoals } from '@/types';
import { normalizeGalleryRecipe } from '@/utils';

// ── Build a taste profile from user interaction history ──────────

export const buildTasteProfile = (
  favorites: SavedRecipe[],
  plannerMeals: PlannerWeek,
  recentRecipes: SavedRecipe[]
): UserTasteProfile => {
  const tagCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  const calories: number[] = [];
  const proteins: number[] = [];

  const countRecipe = (recipe: SavedRecipe, weight: number) => {
    recipe.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + weight;
    });
    if (recipe.difficulty) {
      difficultyCounts[recipe.difficulty] = (difficultyCounts[recipe.difficulty] || 0) + weight;
    }
    if (recipe.nutrition.calories > 0) {
      calories.push(recipe.nutrition.calories);
    }
    const proteinVal = parseFloat(recipe.nutrition.protein?.replace(/[^\d.]/g, '') || '0');
    if (proteinVal > 0) proteins.push(proteinVal);
  };

  // Favorites carry the most weight — these are explicit signals
  favorites.forEach(r => countRecipe(r, 3));

  // Planner meals are strong signals too
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
    const dayMeals = plannerMeals[day];
    if (!dayMeals) return;
    (['breakfast', 'lunch', 'dinner'] as const).forEach(slot => {
      const recipe = dayMeals[slot];
      if (recipe) countRecipe(recipe, 2);
    });
  });

  // Recent recipes are weaker signals — user browsed but didn't commit
  recentRecipes.forEach(r => countRecipe(r, 1));

  // Calculate calorie range
  const avgCal = calories.length > 0
    ? calories.reduce((a, b) => a + b, 0) / calories.length
    : 400;
  const calRange = {
    min: Math.max(100, Math.round(avgCal * 0.6)),
    max: Math.round(avgCal * 1.4),
  };

  // Determine protein preference
  const avgProtein = proteins.length > 0
    ? proteins.reduce((a, b) => a + b, 0) / proteins.length
    : 15;
  const proteinPref: UserTasteProfile['proteinPreference'] =
    avgProtein >= 25 ? 'high' : avgProtein >= 12 ? 'moderate' : 'low';

  return {
    preferredTags: tagCounts,
    preferredDifficulty: difficultyCounts,
    calorieRange: calRange,
    proteinPreference: proteinPref,
    lastUpdated: Date.now(),
  };
};

// ── Score a single recipe against a taste profile + nutrition goals ──

const scoreRecipe = (recipe: any, profile: UserTasteProfile, goals?: NutritionGoals): { score: number; reason: string } => {
  let score = 0;
  let topReason = 'Trending pick';
  let topReasonScore = 0;

  const hasProfile = Object.keys(profile.preferredTags).length > 0;

  if (!hasProfile && !goals) {
    // New user with default goals — give a small random score so order varies
    return { score: Math.random() * 10, reason: 'Trending pick' };
  }

  // Tag matching (strongest signal)
  const tags: string[] = recipe.tags || [];
  let tagScore = 0;
  tags.forEach((tag: string) => {
    const freq = profile.preferredTags[tag] || 0;
    if (freq > 0) {
      tagScore += Math.min(freq * 3, 15); // cap per-tag contribution
    }
  });
  score += tagScore;
  if (tagScore > topReasonScore) {
    const topTag = tags.reduce((best, tag) =>
      (profile.preferredTags[tag] || 0) > (profile.preferredTags[best] || 0) ? tag : best
    , tags[0]);
    topReason = `Because you love ${topTag.toLowerCase()}`;
    topReasonScore = tagScore;
  }

  // Difficulty matching
  const diff = recipe.difficulty || 'Easy';
  const diffScore = (profile.preferredDifficulty[diff] || 0) * 2;
  score += Math.min(diffScore, 10);
  if (diffScore > topReasonScore) {
    topReason = diff === 'Easy' ? 'Quick & easy, just how you like it' : `Matches your ${diff.toLowerCase()} skill level`;
    topReasonScore = diffScore;
  }

  // ── Nutrition goals matching (from sliders) ─────────────────────
  // This is the key integration: recipes that fit user's daily goals
  // score significantly higher. We use per-meal targets (daily / 3).
  if (goals) {
    const mealCalTarget = goals.calories / 3;
    const mealProteinTarget = goals.protein / 3;
    const mealCarbsTarget = goals.carbs / 3;
    const mealFatTarget = goals.fat / 3;

    const cal = recipe.calories || 0;
    const proteinVal = parseFloat((recipe.protein || '0').replace(/[^\d.]/g, ''));
    const carbsVal = parseFloat((recipe.carbs || '0').replace(/[^\d.]/g, ''));
    const fatVal = parseFloat((recipe.fat || '0').replace(/[^\d.]/g, ''));

    // Calorie fit: within ±30% of per-meal target
    if (cal > 0) {
      const calLow = mealCalTarget * 0.7;
      const calHigh = mealCalTarget * 1.3;
      if (cal >= calLow && cal <= calHigh) {
        const fitScore = 12;
        score += fitScore;
        if (fitScore > topReasonScore) {
          topReason = `~${cal} cal — fits your ${goals.calories} kcal/day goal`;
          topReasonScore = fitScore;
        }
      } else if (cal < calLow) {
        // Light recipe — still useful
        score += 4;
        if (4 > topReasonScore) {
          topReason = 'Light option for your goals';
          topReasonScore = 4;
        }
      }
      // Over-calorie penalty
      if (cal > calHigh) {
        score -= 5;
      }
    }

    // Protein fit: within ±40% of per-meal target
    if (proteinVal > 0 && mealProteinTarget > 0) {
      const protLow = mealProteinTarget * 0.6;
      const protHigh = mealProteinTarget * 1.4;
      if (proteinVal >= protLow && proteinVal <= protHigh) {
        const fitScore = 10;
        score += fitScore;
        if (fitScore > topReasonScore) {
          topReason = `${Math.round(proteinVal)}g protein — hits your target`;
          topReasonScore = fitScore;
        }
      } else if (proteinVal >= mealProteinTarget * 1.4) {
        // High protein bonus if user has high protein goals
        if (goals.protein >= 150) {
          score += 6;
          if (6 > topReasonScore) {
            topReason = 'High protein for your goals';
            topReasonScore = 6;
          }
        }
      }
    }

    // Carbs fit
    if (carbsVal > 0 && mealCarbsTarget > 0) {
      const carbLow = mealCarbsTarget * 0.6;
      const carbHigh = mealCarbsTarget * 1.4;
      if (carbsVal >= carbLow && carbsVal <= carbHigh) {
        score += 5;
      }
      // Low-carb bonus if user set low carb goal
      if (goals.carbs <= 100 && carbsVal < 20) {
        score += 4;
        if (4 > topReasonScore) {
          topReason = 'Low carb — matches your target';
          topReasonScore = 4;
        }
      }
    }

    // Fat fit
    if (fatVal > 0 && mealFatTarget > 0) {
      const fatLow = mealFatTarget * 0.6;
      const fatHigh = mealFatTarget * 1.4;
      if (fatVal >= fatLow && fatVal <= fatHigh) {
        score += 4;
      }
    }
  } else {
    // Fallback to profile-based calorie/protein matching
    const cal = recipe.calories || 0;
    if (cal > 0 && cal >= profile.calorieRange.min && cal <= profile.calorieRange.max) {
      score += 8;
      if (8 > topReasonScore) {
        topReason = 'Fits your nutrition goals';
        topReasonScore = 8;
      }
    }

    const proteinVal = parseFloat((recipe.protein || '0').replace(/[^\d.]/g, ''));
    const proteinMatch =
      (profile.proteinPreference === 'high' && proteinVal >= 25) ||
      (profile.proteinPreference === 'moderate' && proteinVal >= 10 && proteinVal < 25) ||
      (profile.proteinPreference === 'low' && proteinVal < 10);
    if (proteinMatch) score += 5;
  }

  // Variety bonus — reward tags user hasn't explored much
  tags.forEach((tag: string) => {
    if (!profile.preferredTags[tag] || profile.preferredTags[tag] <= 1) {
      score += 2;
      if (score <= 5) {
        topReason = 'Something new to try';
      }
    }
  });

  // Small random jitter to prevent identical orderings
  score += Math.random() * 3;

  return { score, reason: topReason };
};

// ── Get personalized recipe list ─────────────────────────────────

export const getPersonalizedRecipes = (
  allRecipes: any[],
  profile: UserTasteProfile,
  count: number = 9,
  goals?: NutritionGoals
): ScoredRecipe[] => {
  // Deduplicate by name
  const seen = new Set<string>();
  const unique = allRecipes.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score and sort — pass nutrition goals from sliders
  const scored: ScoredRecipe[] = unique.map(recipe => {
    const { score, reason } = scoreRecipe(recipe, profile, goals);
    return {
      recipe,
      normalized: normalizeGalleryRecipe(recipe),
      score,
      reason,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count);
};
