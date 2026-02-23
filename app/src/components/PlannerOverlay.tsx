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

const MEAL_META = {
  breakfast: { label: 'Breakfast', emoji: '☀️', accent: 'bg-amber-50 text-amber-600', ring: 'ring-amber-200' },
  lunch: { label: 'Lunch', emoji: '🥗', accent: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-200' },
  dinner: { label: 'Dinner', emoji: '🍽️', accent: 'bg-violet-50 text-violet-600', ring: 'ring-violet-200' },
} as const;

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
    <div className="fixed inset-0 bg-[#F7F3EB]/98 backdrop-blur-sm z-[200] flex flex-col overflow-hidden animate-overlay-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-[#E8E6DC] flex-shrink-0 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C49A5C]/10 rounded-2xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#C49A5C]" />
          </div>
          <div>
            <h2 className="text-xl font-black lowercase text-[#1A1A1A] tracking-tight">meal planner</h2>
            <p className="text-xs text-[#6E6A60]">plan your week, one meal at a time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onOpenExportModal()} variant="outline" className="rounded-full text-xs gap-1.5 hidden sm:flex border-[#E8E6DC] hover:bg-[#E8E6DC]" size="sm">
            <ExternalLink className="w-3.5 h-3.5" /> Export
          </Button>
          <Button onClick={onShareMealPlan} variant="outline" className="rounded-full text-xs gap-1.5 hidden sm:flex border-[#E8E6DC] hover:bg-[#E8E6DC]" size="sm">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button onClick={onClearPlannerWeek} variant="outline" className="rounded-full text-xs gap-1.5 text-red-400 hover:text-red-500 border-red-200 hover:border-red-300 hover:bg-red-50 hidden sm:flex" size="sm">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
          <button
            onClick={() => { onClose(); setRecipeToAssign(null); setPlannerSearchQuery(''); setPlannerSidebarOpen(false); }}
            className="w-9 h-9 rounded-full bg-[#F4F2EA] flex items-center justify-center text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Two-Panel Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR — Recipe Library */}
        <div className={`${
          plannerSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 absolute lg:relative z-10 w-[300px] flex-shrink-0 border-r border-[#E8E6DC] flex flex-col bg-white/90 backdrop-blur-md lg:bg-white/60 transition-transform duration-300 h-full`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#E8E6DC]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C49A5C]" />
                <h3 className="font-bold text-sm text-[#1A1A1A] lowercase">recipe library</h3>
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
          <div className="flex border-b border-[#E8E6DC]">
            {(['saved', 'recent', 'browse'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPlannerSidebarTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  plannerSidebarTab === tab
                    ? 'text-[#C49A5C] border-b-2 border-[#C49A5C]'
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
                  <div className="text-center py-12 px-4">
                    <div className="w-14 h-14 bg-[#F4F2EA] rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <UtensilsCrossed className="w-6 h-6 text-[#C49A5C]/40" />
                    </div>
                    <p className="text-sm text-[#6E6A60] leading-relaxed">
                      {plannerSearchQuery ? 'No matching recipes' :
                       plannerSidebarTab === 'saved' ? 'No saved recipes yet' :
                       plannerSidebarTab === 'recent' ? 'No recent recipes' : 'Browse our collection'}
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
                      ? 'bg-[#C49A5C]/10 ring-1 ring-[#C49A5C]/30 shadow-sm'
                      : 'hover:bg-[#F4F2EA]'
                  }`}
                >
                  {recipe.image ? (
                    <img src={recipe.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#F4F2EA] flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-5 h-5 text-[#C49A5C]/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">{toTitleCase(recipe.name)}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#6E6A60] mt-0.5">
                      {recipe.nutrition.calories > 0 && <span>{recipe.nutrition.calories} cal</span>}
                      {recipe.totalTime !== 'N/A' && <span>· {recipe.totalTime}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#6E6A60]/30 flex-shrink-0" />
                </button>
              ));
            })()}
          </div>
        </div>

        {/* RIGHT MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <div className="max-w-5xl mx-auto">
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setPlannerSidebarOpen(true)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-[#C49A5C] font-semibold px-4 py-2 bg-[#C49A5C]/8 rounded-full mb-5 hover:bg-[#C49A5C]/15 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" /> Recipe Library
            </button>

            {/* ── Day Selector ── */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const dayMeals = plannerMeals[day];
                const filledCount = (dayMeals?.breakfast ? 1 : 0) + (dayMeals?.lunch ? 1 : 0) + (dayMeals?.dinner ? 1 : 0);
                const isActive = plannerActiveDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setPlannerActiveDay(day)}
                    className={`relative flex-1 min-w-[68px] py-3 px-2 rounded-2xl font-semibold text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-[#1A1A1A] text-white shadow-lg shadow-black/10'
                        : 'bg-white text-[#1A1A1A] hover:bg-[#F4F2EA] border border-[#E8E6DC]'
                    }`}
                  >
                    <span className="block text-sm font-bold">{day}</span>
                    <div className="flex gap-0.5 justify-center mt-2">
                      {(['breakfast', 'lunch', 'dinner'] as const).map(slot => (
                        <div
                          key={slot}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            dayMeals?.[slot]
                              ? isActive ? 'bg-[#C49A5C]' : 'bg-[#C49A5C]'
                              : isActive ? 'bg-white/20' : 'bg-[#E8E6DC]'
                          }`}
                        />
                      ))}
                    </div>
                    {filledCount > 0 && (
                      <span className={`text-[10px] mt-1 block font-medium ${isActive ? 'text-[#C49A5C]' : 'text-[#6E6A60]'}`}>
                        {filledCount}/3
                      </span>
                    )}
                    {filledCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onClearPlannerDay(day); }}
                        className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${
                          isActive ? 'bg-white text-[#1A1A1A]' : 'bg-[#1A1A1A] text-white'
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
              <div className="bg-[#C49A5C]/8 border border-[#C49A5C]/15 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {recipeToAssign.image && (
                    <img src={recipeToAssign.image} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">Adding: {toTitleCase(recipeToAssign.name)}</p>
                    <p className="text-xs text-[#6E6A60]">Tap a meal slot below to assign</p>
                  </div>
                </div>
                <button
                  onClick={() => setRecipeToAssign(null)}
                  className="text-xs text-[#6E6A60] font-medium px-3 py-1.5 rounded-full hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── Meal Slots ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
                const recipe = plannerMeals[plannerActiveDay]?.[mealType] as SavedRecipe | null;
                const meta = MEAL_META[mealType];
                return (
                  <div key={mealType}>
                    {recipe ? (
                      /* ── Filled Meal Card ── */
                      <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-[#E8E6DC] hover:shadow-md transition-shadow planner-card-enter">
                        {/* Meal type header */}
                        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${meta.accent}`}>
                            {meta.emoji}
                          </div>
                          <h3 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">{meta.label}</h3>
                        </div>

                        {recipe.image && (
                          <div className="relative h-36 mx-4 rounded-2xl overflow-hidden">
                            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover image-grade" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <p className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm leading-snug drop-shadow-sm">{toTitleCase(recipe.name)}</p>
                          </div>
                        )}

                        <div className="px-5 py-3">
                          {!recipe.image && <p className="font-bold text-sm text-[#1A1A1A] mb-2">{toTitleCase(recipe.name)}</p>}

                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#6E6A60] mb-3">
                            {recipe.nutrition.calories > 0 && (
                              <span className="bg-[#F7F3EB] px-2 py-0.5 rounded-full">{recipe.nutrition.calories} cal</span>
                            )}
                            {recipe.nutrition.protein !== '0g' && (
                              <span className="bg-[#F7F3EB] px-2 py-0.5 rounded-full">P: {recipe.nutrition.protein}</span>
                            )}
                            {recipe.nutrition.carbs !== '0g' && (
                              <span className="bg-[#F7F3EB] px-2 py-0.5 rounded-full">C: {recipe.nutrition.carbs}</span>
                            )}
                            {recipe.nutrition.fat !== '0g' && (
                              <span className="bg-[#F7F3EB] px-2 py-0.5 rounded-full">F: {recipe.nutrition.fat}</span>
                            )}
                            {recipe.totalTime !== 'N/A' && (
                              <span className="bg-[#F7F3EB] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> {recipe.totalTime}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={generateGoogleCalendarUrl(recipe, mealType, plannerActiveDay)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-[#C49A5C] hover:text-[#8B6F3C] font-medium px-2.5 py-1.5 bg-[#C49A5C]/8 rounded-full transition-colors"
                            >
                              <Calendar className="w-3 h-3" /> Calendar
                            </a>
                            <button
                              onClick={() => onRemoveFromPlanner(plannerActiveDay, mealType)}
                              className="flex items-center gap-1 text-[11px] text-[#6E6A60] hover:text-red-400 font-medium px-2.5 py-1.5 rounded-full transition-colors ml-auto"
                            >
                              <X className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : recipeToAssign ? (
                      /* ── Empty + Assigning ── */
                      <button
                        onClick={() => onAddRecipeToPlanner(recipeToAssign, plannerActiveDay, mealType)}
                        className="w-full bg-white rounded-[24px] overflow-hidden border-2 border-dashed border-[#C49A5C]/40 hover:border-[#C49A5C] hover:bg-[#C49A5C]/5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${meta.accent}`}>
                            {meta.emoji}
                          </div>
                          <h3 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">{meta.label}</h3>
                        </div>
                        <div className="flex flex-col items-center py-8 px-5">
                          <div className="w-12 h-12 rounded-2xl bg-[#C49A5C]/10 flex items-center justify-center mb-2 group-hover:bg-[#C49A5C]/20 transition-colors">
                            <Plus className="w-6 h-6 text-[#C49A5C]" />
                          </div>
                          <p className="text-sm font-semibold text-[#C49A5C]">Add here</p>
                        </div>
                      </button>
                    ) : (
                      /* ── Empty State ── */
                      <div className="bg-white/60 rounded-[24px] overflow-hidden border border-dashed border-[#E8E6DC]">
                        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-50 ${meta.accent}`}>
                            {meta.emoji}
                          </div>
                          <h3 className="font-bold text-[#A09A90] text-xs uppercase tracking-wider">{meta.label}</h3>
                        </div>
                        <div className="flex flex-col items-center py-8 px-5">
                          <div className="w-12 h-12 rounded-2xl bg-[#F4F2EA] flex items-center justify-center mb-2">
                            <Plus className="w-5 h-5 text-[#C49A5C]/30" />
                          </div>
                          <p className="text-xs text-[#A09A90]">Select from library</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Daily Nutrition ── */}
            {(() => {
              const dayNutrition = getDayNutrition(plannerMeals, plannerActiveDay);
              const hasMeals = (['breakfast', 'lunch', 'dinner'] as const).some(
                (slot) => plannerMeals[plannerActiveDay]?.[slot] !== null && plannerMeals[plannerActiveDay]?.[slot] !== undefined
              );
              if (!hasMeals) return null;
              return (
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6DC] mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-[#C49A5C]" />
                    <h4 className="font-bold text-sm text-[#1A1A1A] lowercase">{plannerActiveDay}'s nutrition</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { label: 'calories', value: dayNutrition.calories, unit: '', current: dayNutrition.calories, goal: nutritionGoals.calories, color: 'text-[#C49A5C]' },
                      { label: 'protein', value: dayNutrition.protein, unit: '', current: parseNutritionValue(dayNutrition.protein), goal: nutritionGoals.protein, color: 'text-[#8B6F3C]' },
                      { label: 'carbs', value: dayNutrition.carbs, unit: '', current: parseNutritionValue(dayNutrition.carbs), goal: nutritionGoals.carbs, color: 'text-[#8B6F3C]' },
                      { label: 'fat', value: dayNutrition.fat, unit: '', current: parseNutritionValue(dayNutrition.fat), goal: nutritionGoals.fat, color: 'text-[#8B6F3C]' },
                    ] as const).map(({ label, value, current, goal, color }) => (
                      <div key={label} className="text-center">
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                        <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider mt-0.5">{label}</p>
                        <div className="h-1 bg-[#F4F2EA] rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all ${getNutritionProgressColor(current, goal)}`}
                            style={{ width: `${getNutritionProgressPct(current, goal)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-[#A09A90] mt-1">
                          {getNutritionProgressPct(current, goal)}% of {goal}{label === 'calories' ? '' : 'g'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Week at a Glance ── */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6DC]">
              <h3 className="font-bold text-sm text-[#1A1A1A] lowercase mb-5">week at a glance</h3>

              {/* Mini day cards */}
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const dayMeals = plannerMeals[day];
                  const dayCals = getDayNutrition(plannerMeals, day).calories;
                  const isActive = plannerActiveDay === day;
                  return (
                    <button
                      key={day}
                      className={`rounded-2xl p-3 text-center transition-all duration-200 ${
                        isActive
                          ? 'bg-[#1A1A1A] text-white shadow-md'
                          : 'bg-[#F7F3EB] hover:bg-[#F4F2EA]'
                      }`}
                      onClick={() => setPlannerActiveDay(day)}
                    >
                      <p className={`font-bold text-xs mb-2 ${isActive ? 'text-white' : 'text-[#1A1A1A]'}`}>{day}</p>
                      <div className="flex gap-0.5 justify-center">
                        {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                          <div
                            key={meal}
                            className={`w-1.5 h-1.5 rounded-full ${
                              dayMeals?.[meal]
                                ? isActive ? 'bg-[#C49A5C]' : 'bg-[#C49A5C]'
                                : isActive ? 'bg-white/20' : 'bg-[#E8E6DC]'
                            }`}
                          />
                        ))}
                      </div>
                      {dayCals > 0 && (
                        <p className={`text-[10px] font-semibold mt-1.5 ${
                          isActive ? 'text-[#C49A5C]' : 'text-[#6E6A60]'
                        }`}>
                          {dayCals}<span className="text-[8px] ml-0.5">cal</span>
                        </p>
                      )}
                    </button>
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
                  <div className="mt-5 pt-5 border-t border-[#E8E6DC]">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame className="w-4 h-4 text-[#C49A5C]" />
                      <h4 className="font-bold text-sm text-[#1A1A1A] lowercase">weekly summary</h4>
                      <span className="text-[10px] text-[#6E6A60] ml-auto">{daysWithMeals} day{daysWithMeals !== 1 ? 's' : ''} planned</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {([
                        { label: 'total cal', value: weeklyNutrition.calories.toLocaleString(), accent: true },
                        { label: 'protein', value: weeklyNutrition.protein, accent: false },
                        { label: 'carbs', value: weeklyNutrition.carbs, accent: false },
                        { label: 'fat', value: weeklyNutrition.fat, accent: false },
                      ] as const).map(({ label, value, accent }) => (
                        <div key={label} className="text-center bg-[#F7F3EB] rounded-2xl py-3 px-2">
                          <p className={`text-lg font-black ${accent ? 'text-[#C49A5C]' : 'text-[#1A1A1A]'}`}>{value}</p>
                          <p className="text-[10px] text-[#6E6A60] font-medium uppercase tracking-wider">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#F7F3EB] rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1A1A1A] lowercase">daily average</span>
                      <div className="flex items-center gap-3 text-xs text-[#6E6A60]">
                        <span className="font-bold text-[#C49A5C]">{dailyAvgCals} cal</span>
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
