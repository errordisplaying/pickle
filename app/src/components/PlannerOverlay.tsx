import { useState } from 'react';
import {
  Calendar, X, Plus, ExternalLink, Share2, Trash2,
  BookOpen, Search, UtensilsCrossed, ChevronRight, Clock, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SavedRecipe, PlannerWeek, NutritionGoals } from '@/types';
import { suggestedRecipes } from '@/data';
import {
  normalizeGalleryRecipe, toTitleCase,
  getDayNutrition, getWeeklyNutrition,
  getNutritionProgressColor, getNutritionProgressPct,
  parseNutritionValue, generateGoogleCalendarUrl
} from '@/utils';

interface PlannerOverlayProps {
  plannerMeals: PlannerWeek;
  plannerActiveDay: string;
  setPlannerActiveDay: (day: string) => void;
  recipeToAssign: SavedRecipe | null;
  setRecipeToAssign: (recipe: SavedRecipe | null) => void;
  favorites: SavedRecipe[];
  recentRecipes: SavedRecipe[];
  nutritionGoals: NutritionGoals;
  onAddRecipeToPlanner: (recipe: SavedRecipe, day: string, slot: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveFromPlanner: (day: string, slot: 'breakfast' | 'lunch' | 'dinner') => void;
  onClearPlannerDay: (day: string) => void;
  onClearPlannerWeek: () => void;
  onShareMealPlan: () => void;
  onOpenExportModal: () => void;
  onClose: () => void;
}

export default function PlannerOverlay({
  plannerMeals,
  plannerActiveDay,
  setPlannerActiveDay,
  recipeToAssign,
  setRecipeToAssign,
  favorites,
  recentRecipes,
  nutritionGoals,
  onAddRecipeToPlanner,
  onRemoveFromPlanner,
  onClearPlannerDay,
  onClearPlannerWeek,
  onShareMealPlan,
  onOpenExportModal,
  onClose,
}: PlannerOverlayProps) {
  const [plannerSidebarTab, setPlannerSidebarTab] = useState<'saved' | 'recent' | 'browse'>('saved');
  const [plannerSearchQuery, setPlannerSearchQuery] = useState('');
  const [plannerSidebarOpen, setPlannerSidebarOpen] = useState(false);

  const getFilteredSidebarRecipes = (): SavedRecipe[] => {
    const q = plannerSearchQuery.toLowerCase().trim();
    let pool: SavedRecipe[] = [];

    if (plannerSidebarTab === 'saved') {
      pool = favorites;
    } else if (plannerSidebarTab === 'recent') {
      pool = recentRecipes;
    } else {
      pool = suggestedRecipes.map((r: any) => normalizeGalleryRecipe(r));
    }

    if (!q) return pool;
    return pool.filter(r => r.name.toLowerCase().includes(q));
  };

  return (
        <div className="fixed inset-0 bg-[#F4F2EA]/98 backdrop-blur-sm z-[200] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8B7355]/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#8B7355]" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase text-[#1A1A1A] tracking-tight">Meal Planner</h2>
                <p className="text-xs text-[#6E6A60]">Plan your week, one meal at a time</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => onOpenExportModal()} variant="outline" className="rounded-full text-xs gap-1.5 hidden sm:flex" size="sm">
                <ExternalLink className="w-3.5 h-3.5" /> Export Week
              </Button>
              <Button onClick={onShareMealPlan} variant="outline" className="rounded-full text-xs gap-1.5 hidden sm:flex" size="sm">
                <Share2 className="w-3.5 h-3.5" /> Share Plan
              </Button>
              <Button onClick={onClearPlannerWeek} variant="outline" className="rounded-full text-xs gap-1.5 text-red-500 hover:text-red-600 hidden sm:flex" size="sm">
                <Trash2 className="w-3.5 h-3.5" /> Clear Week
              </Button>
              <Button onClick={() => { onClose(); setRecipeToAssign(null); setPlannerSearchQuery(''); setPlannerSidebarOpen(false); }} variant="outline" className="rounded-full h-9 w-9 p-0 flex items-center justify-center">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Two-Panel Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT SIDEBAR — Recipe Library */}
            <div className={`${
              plannerSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 absolute lg:relative z-10 w-[320px] flex-shrink-0 border-r border-black/5 flex flex-col bg-white/80 backdrop-blur-md lg:bg-white/50 transition-transform duration-300 h-full`}>
              {/* Sidebar Header */}
              <div className="p-4 border-b border-black/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#8B7355]" />
                    <h3 className="font-bold text-sm text-[#1A1A1A]">Recipe Library</h3>
                  </div>
                  <button onClick={() => setPlannerSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-full bg-[#F4F2EA] flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-[#6E6A60]" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#6E6A60] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={plannerSearchQuery}
                    onChange={(e) => setPlannerSearchQuery(e.target.value)}
                    placeholder="Search recipes..."
                    className="pl-9 rounded-xl bg-[#F4F2EA] border-0 text-sm h-9"
                  />
                </div>
              </div>

              {/* Sidebar Tabs */}
              <div className="flex border-b border-black/5">
                {(['saved', 'recent', 'browse'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPlannerSidebarTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                      plannerSidebarTab === tab
                        ? 'text-[#8B7355] border-b-2 border-[#8B7355]'
                        : 'text-[#6E6A60] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {tab === 'saved' ? `Saved (${favorites.length})` : tab === 'recent' ? `Recent (${recentRecipes.length})` : 'Browse'}
                  </button>
                ))}
              </div>

              {/* Recipe Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 planner-sidebar-scroll">
                {(() => {
                  const sidebarRecipes = getFilteredSidebarRecipes();
                  if (sidebarRecipes.length === 0) {
                    return (
                      <div className="text-center py-10 px-4">
                        <UtensilsCrossed className="w-10 h-10 text-[#E8E6DC] mx-auto mb-3" />
                        <p className="text-sm text-[#6E6A60]">
                          {plannerSearchQuery ? 'No matching recipes' :
                           plannerSidebarTab === 'saved' ? 'No saved recipes yet. Heart a recipe to save it!' :
                           plannerSidebarTab === 'recent' ? 'No recent recipes. Try searching for some!' : 'Browse our recipe collection'}
                        </p>
                      </div>
                    );
                  }
                  return sidebarRecipes.map((recipe, idx) => (
                    <button
                      key={recipe.id || idx}
                      onClick={() => setRecipeToAssign(recipe)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all duration-150 ${
                        recipeToAssign?.name === recipe.name
                          ? 'bg-[#8B7355]/15 border border-[#8B7355]/30 shadow-sm'
                          : 'hover:bg-[#F4F2EA] border border-transparent'
                      }`}
                    >
                      {recipe.image ? (
                        <img src={recipe.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#F4F2EA] flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-5 h-5 text-[#8B7355]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{toTitleCase(recipe.name)}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#6E6A60] mt-0.5">
                          {recipe.nutrition.calories > 0 && <span>{recipe.nutrition.calories} cal</span>}
                          {recipe.totalTime !== 'N/A' && <span>· {recipe.totalTime}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6E6A60]/50 flex-shrink-0" />
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* RIGHT MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6">
              <div className="max-w-5xl mx-auto">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setPlannerSidebarOpen(true)}
                className="lg:hidden flex items-center gap-1.5 text-xs text-[#8B7355] font-semibold px-4 py-2 bg-[#8B7355]/8 rounded-full mb-4 hover:bg-[#8B7355]/15 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> Recipe Library
              </button>

              {/* Day Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const dayMeals = plannerMeals[day];
                  const filledCount = (dayMeals?.breakfast ? 1 : 0) + (dayMeals?.lunch ? 1 : 0) + (dayMeals?.dinner ? 1 : 0);
                  const isActive = plannerActiveDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setPlannerActiveDay(day)}
                      className={`flex-1 min-w-[72px] py-4 px-3 rounded-2xl font-semibold text-sm transition-all duration-200 relative group ${
                        isActive
                          ? 'bg-[#8B7355] text-white shadow-lg shadow-[#8B7355]/20'
                          : 'bg-white text-[#1A1A1A] hover:bg-[#E8E6DC] border border-black/5'
                      }`}
                    >
                      <span className="block text-base font-bold">{day}</span>
                      {filledCount > 0 && (
                        <span className={`text-[10px] mt-1 block ${isActive ? 'text-white/80' : 'text-[#8B7355]'}`}>
                          {filledCount}/3 meals
                        </span>
                      )}
                      <div className="flex gap-0.5 justify-center mt-1.5">
                        {(['breakfast', 'lunch', 'dinner'] as const).map(slot => (
                          <div
                            key={slot}
                            className={`w-1.5 h-1.5 rounded-full ${
                              dayMeals?.[slot]
                                ? isActive ? 'bg-white' : 'bg-[#8B7355]'
                                : isActive ? 'bg-white/30' : 'bg-black/10'
                            }`}
                          />
                        ))}
                      </div>
                      {filledCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onClearPlannerDay(day); }}
                          className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'bg-white text-[#8B7355]' : 'bg-[#8B7355] text-white'
                          }`}
                          title="Clear day"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Recipe Assignment Banner */}
              {recipeToAssign && (
                <div className="bg-[#8B7355]/10 border border-[#8B7355]/20 rounded-2xl p-4 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {recipeToAssign.image && (
                      <img src={recipeToAssign.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">Adding: {toTitleCase(recipeToAssign.name)}</p>
                      <p className="text-xs text-[#6E6A60]">Tap a meal slot below to assign this recipe</p>
                    </div>
                  </div>
                  <Button onClick={() => setRecipeToAssign(null)} variant="outline" className="rounded-full text-xs" size="sm">
                    Cancel
                  </Button>
                </div>
              )}

              {/* Meal Slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
                  const recipe = plannerMeals[plannerActiveDay]?.[mealType] as SavedRecipe | null;
                  return (
                    <div key={mealType}>
                      {recipe ? (
                        /* ── Filled Meal Card ── */
                        <div className="bg-white rounded-[24px] overflow-hidden shadow-md border border-black/5 planner-card-enter">
                          <div className="flex items-center justify-between px-5 pt-4 pb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                                mealType === 'breakfast' ? 'bg-amber-50 text-amber-500' :
                                mealType === 'lunch' ? 'bg-emerald-50 text-emerald-500' :
                                'bg-indigo-50 text-indigo-500'
                              }`}>
                                {mealType === 'breakfast' ? '\u2600\uFE0F' : mealType === 'lunch' ? '\uD83E\uDD57' : '\uD83C\uDF7D\uFE0F'}
                              </div>
                              <h3 className="font-bold text-[#1A1A1A] capitalize text-sm">{mealType}</h3>
                            </div>
                          </div>

                          {recipe.image && (
                            <div className="relative h-40 mx-4 rounded-2xl overflow-hidden">
                              <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover image-grade" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              <p className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm leading-snug">{toTitleCase(recipe.name)}</p>
                            </div>
                          )}

                          <div className="px-5 py-3">
                            {!recipe.image && <p className="font-bold text-sm text-[#1A1A1A] mb-2">{toTitleCase(recipe.name)}</p>}

                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#6E6A60] mb-3">
                              {recipe.nutrition.calories > 0 && (
                                <span className="bg-[#F4F2EA] px-2 py-0.5 rounded-full">{recipe.nutrition.calories} cal</span>
                              )}
                              {recipe.nutrition.protein !== '0g' && (
                                <span className="bg-[#F4F2EA] px-2 py-0.5 rounded-full">P: {recipe.nutrition.protein}</span>
                              )}
                              {recipe.nutrition.carbs !== '0g' && (
                                <span className="bg-[#F4F2EA] px-2 py-0.5 rounded-full">C: {recipe.nutrition.carbs}</span>
                              )}
                              {recipe.nutrition.fat !== '0g' && (
                                <span className="bg-[#F4F2EA] px-2 py-0.5 rounded-full">F: {recipe.nutrition.fat}</span>
                              )}
                              {recipe.totalTime !== 'N/A' && (
                                <span className="bg-[#F4F2EA] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {recipe.totalTime}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={generateGoogleCalendarUrl(recipe, mealType, plannerActiveDay)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-[#8B7355] hover:text-[#6B5740] font-medium px-3 py-1.5 bg-[#8B7355]/8 rounded-full transition-colors"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Add to Calendar
                              </a>
                              <button
                                onClick={() => onRemoveFromPlanner(plannerActiveDay, mealType)}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 font-medium px-3 py-1.5 rounded-full transition-colors ml-auto"
                              >
                                <X className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : recipeToAssign ? (
                        /* ── Empty + Assigning ── */
                        <button
                          onClick={() => onAddRecipeToPlanner(recipeToAssign, plannerActiveDay, mealType)}
                          className="w-full bg-white rounded-[24px] overflow-hidden shadow-sm border-2 border-dashed border-[#8B7355] hover:bg-[#8B7355]/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                              mealType === 'breakfast' ? 'bg-amber-50 text-amber-500' :
                              mealType === 'lunch' ? 'bg-emerald-50 text-emerald-500' :
                              'bg-indigo-50 text-indigo-500'
                            }`}>
                              {mealType === 'breakfast' ? '\u2600\uFE0F' : mealType === 'lunch' ? '\uD83E\uDD57' : '\uD83C\uDF7D\uFE0F'}
                            </div>
                            <h3 className="font-bold text-[#1A1A1A] capitalize text-sm">{mealType}</h3>
                          </div>
                          <div className="flex flex-col items-center py-8 px-5">
                            <Plus className="w-8 h-8 text-[#8B7355] mb-2" />
                            <p className="text-sm font-semibold text-[#8B7355]">Add "{toTitleCase(recipeToAssign.name)}"</p>
                            <p className="text-xs text-[#6E6A60] mt-1">Tap to assign to {mealType}</p>
                          </div>
                        </button>
                      ) : (
                        /* ── Empty State ── */
                        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-dashed border-black/10">
                          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                              mealType === 'breakfast' ? 'bg-amber-50 text-amber-500' :
                              mealType === 'lunch' ? 'bg-emerald-50 text-emerald-500' :
                              'bg-indigo-50 text-indigo-500'
                            }`}>
                              {mealType === 'breakfast' ? '\u2600\uFE0F' : mealType === 'lunch' ? '\uD83E\uDD57' : '\uD83C\uDF7D\uFE0F'}
                            </div>
                            <h3 className="font-bold text-[#6E6A60] capitalize text-sm">{mealType}</h3>
                          </div>
                          <div className="flex flex-col items-center py-8 px-5">
                            <div className="w-14 h-14 rounded-2xl bg-[#F4F2EA] flex items-center justify-center mb-3">
                              <Plus className="w-6 h-6 text-[#8B7355]/40" />
                            </div>
                            <p className="text-sm text-[#6E6A60]">Add a meal</p>
                            <p className="text-[11px] text-[#6E6A60]/60 mt-1">Select from the Recipe Library</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Daily Nutrition Totals */}
              {(() => {
                const dayNutrition = getDayNutrition(plannerMeals, plannerActiveDay);
                const hasMeals = (['breakfast', 'lunch', 'dinner'] as const).some(
                  (slot) => plannerMeals[plannerActiveDay]?.[slot] !== null && plannerMeals[plannerActiveDay]?.[slot] !== undefined
                );
                if (!hasMeals) return null;
                return (
                  <div className="bg-gradient-to-r from-[#8B7355]/10 to-[#6B5740]/10 rounded-[20px] p-5 border border-[#8B7355]/15">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-4 h-4 text-[#8B7355]" />
                      <h4 className="font-bold text-sm text-[#1A1A1A]">{plannerActiveDay}'s Nutrition</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center bg-white/70 rounded-2xl py-3 px-2">
                        <p className="text-xl font-black text-[#8B7355]">{dayNutrition.calories}</p>
                        <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider mt-0.5">Calories</p>
                      </div>
                      <div className="text-center bg-white/70 rounded-2xl py-3 px-2">
                        <p className="text-xl font-black text-[#6B5740]">{dayNutrition.protein}</p>
                        <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider mt-0.5">Protein</p>
                      </div>
                      <div className="text-center bg-white/70 rounded-2xl py-3 px-2">
                        <p className="text-xl font-black text-[#6B5740]">{dayNutrition.carbs}</p>
                        <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider mt-0.5">Carbs</p>
                      </div>
                      <div className="text-center bg-white/70 rounded-2xl py-3 px-2">
                        <p className="text-xl font-black text-[#6B5740]">{dayNutrition.fat}</p>
                        <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider mt-0.5">Fat</p>
                      </div>
                    </div>
                    {/* Goal Progress Bars */}
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {([
                        { label: 'Cal', current: dayNutrition.calories, goal: nutritionGoals.calories },
                        { label: 'Protein', current: parseNutritionValue(dayNutrition.protein), goal: nutritionGoals.protein },
                        { label: 'Carbs', current: parseNutritionValue(dayNutrition.carbs), goal: nutritionGoals.carbs },
                        { label: 'Fat', current: parseNutritionValue(dayNutrition.fat), goal: nutritionGoals.fat },
                      ] as const).map(({ label, current, goal }) => (
                        <div key={label}>
                          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getNutritionProgressColor(current, goal)}`}
                              style={{ width: `${getNutritionProgressPct(current, goal)}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-center text-[#6E6A60] mt-0.5 font-medium">
                            {getNutritionProgressPct(current, goal)}% of {goal}{label === 'Cal' ? '' : 'g'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Weekly Overview */}
              <div className="bg-white rounded-[28px] p-6 shadow-md border border-black/5">
                <h3 className="font-bold text-lg text-[#1A1A1A] mb-4">Week at a Glance</h3>
                <div className="grid grid-cols-7 gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const dayMeals = plannerMeals[day];
                    const dayCals = getDayNutrition(plannerMeals, day).calories;
                    return (
                      <div
                        key={day}
                        className={`rounded-2xl p-3 text-center cursor-pointer transition-all ${
                          plannerActiveDay === day ? 'bg-[#8B7355] text-white' : 'bg-[#F4F2EA]'
                        }`}
                        onClick={() => setPlannerActiveDay(day)}
                      >
                        <p className="font-bold text-sm mb-2">{day}</p>
                        <div className="space-y-1">
                          {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                            <div
                              key={meal}
                              className={`w-2 h-2 rounded-full mx-auto ${
                                dayMeals?.[meal]
                                  ? plannerActiveDay === day ? 'bg-white' : 'bg-[#8B7355]'
                                  : plannerActiveDay === day ? 'bg-white/30' : 'bg-black/10'
                              }`}
                            />
                          ))}
                        </div>
                        {dayCals > 0 && (
                          <p className={`text-[10px] font-semibold mt-1.5 ${
                            plannerActiveDay === day ? 'text-white/80' : 'text-[#8B7355]'
                          }`}>
                            {dayCals}
                            <span className="text-[8px] ml-0.5">cal</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Weekly Nutrition Summary */}
                {(() => {
                  const weeklyNutrition = getWeeklyNutrition(plannerMeals);
                  if (weeklyNutrition.calories === 0) return null;
                  const daysWithMeals = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter(
                    (day) => (['breakfast', 'lunch', 'dinner'] as const).some(
                      (slot) => plannerMeals[day]?.[slot] !== null && plannerMeals[day]?.[slot] !== undefined
                    )
                  ).length;
                  const dailyAvgCals = daysWithMeals > 0 ? Math.round(weeklyNutrition.calories / daysWithMeals) : 0;
                  const dailyAvgProtein = daysWithMeals > 0 ? Math.round(weeklyNutrition.protein / daysWithMeals) : 0;
                  const dailyAvgCarbs = daysWithMeals > 0 ? Math.round(weeklyNutrition.carbs / daysWithMeals) : 0;
                  const dailyAvgFat = daysWithMeals > 0 ? Math.round(weeklyNutrition.fat / daysWithMeals) : 0;
                  return (
                    <div className="mt-5 pt-5 border-t border-black/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-[#8B7355]" />
                        <h4 className="font-bold text-sm text-[#1A1A1A]">Weekly Summary</h4>
                        <span className="text-[10px] text-[#6E6A60] ml-auto">{daysWithMeals} day{daysWithMeals !== 1 ? 's' : ''} planned</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="text-center bg-[#F4F2EA] rounded-2xl py-2.5 px-2">
                          <p className="text-lg font-black text-[#8B7355]">{weeklyNutrition.calories.toLocaleString()}</p>
                          <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider">Total Cal</p>
                        </div>
                        <div className="text-center bg-[#F4F2EA] rounded-2xl py-2.5 px-2">
                          <p className="text-lg font-black text-[#6B5740]">{weeklyNutrition.protein}</p>
                          <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider">Protein</p>
                        </div>
                        <div className="text-center bg-[#F4F2EA] rounded-2xl py-2.5 px-2">
                          <p className="text-lg font-black text-[#6B5740]">{weeklyNutrition.carbs}</p>
                          <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider">Carbs</p>
                        </div>
                        <div className="text-center bg-[#F4F2EA] rounded-2xl py-2.5 px-2">
                          <p className="text-lg font-black text-[#6B5740]">{weeklyNutrition.fat}</p>
                          <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider">Fat</p>
                        </div>
                      </div>
                      <div className="bg-[#8B7355]/8 rounded-xl px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#6B5740]">Daily Average</span>
                        <div className="flex items-center gap-3 text-xs text-[#6E6A60]">
                          <span className="font-bold text-[#8B7355]">{dailyAvgCals} cal</span>
                          <span>{dailyAvgProtein}g P</span>
                          <span>{dailyAvgCarbs}g C</span>
                          <span>{dailyAvgFat}g F</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          </div>
        </div>
  );
}
