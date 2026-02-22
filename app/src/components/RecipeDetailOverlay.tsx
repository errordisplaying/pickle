import { useEffect, useState } from 'react';
import { X, Heart, Calendar, Share2, Clock, Flame, ChefHat, Lightbulb, Printer, ExternalLink, Check } from 'lucide-react';
import { toTitleCase } from '@/utils';
import type { SavedRecipe } from '@/types';

interface RecipeDetailOverlayProps {
  recipe: SavedRecipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: SavedRecipe) => void;
  onAddToPlanner: (recipe: SavedRecipe) => void;
  onShareRecipe: (recipe: SavedRecipe) => void;
  onClose: () => void;
}

export default function RecipeDetailOverlay({
  recipe,
  isFavorite,
  onToggleFavorite,
  onAddToPlanner,
  onShareRecipe,
  onClose,
}: RecipeDetailOverlayProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Parse numeric value from nutrition string like "25g" -> 25
  const parseNutrition = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseInt(val) || 0;
  };

  // Calculate macro percentages for visual bar
  const protein = parseNutrition(recipe.nutrition.protein);
  const carbs = parseNutrition(recipe.nutrition.carbs);
  const fat = parseNutrition(recipe.nutrition.fat);
  const totalMacroGrams = protein + carbs + fat;
  const proteinPct = totalMacroGrams > 0 ? Math.round((protein / totalMacroGrams) * 100) : 0;
  const carbsPct = totalMacroGrams > 0 ? Math.round((carbs / totalMacroGrams) * 100) : 0;
  const fatPct = totalMacroGrams > 0 ? 100 - proteinPct - carbsPct : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Content Card */}
      <div
        className="relative w-full max-w-[900px] max-h-[90vh] bg-[#F4F2EA] rounded-[28px] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh] recipe-slider">
          {/* Hero Image */}
          <div className="relative h-[36vh] min-h-[260px]">
            <img
              src={recipe.image}
              alt={recipe.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="absolute top-4 right-16 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
              title="Print recipe"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Tags on image */}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {recipe.tags.map(tag => (
                <span key={tag} className="text-xs bg-[#C49A5C]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>

            {/* Title over image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl font-black text-white leading-tight drop-shadow-lg">
                {toTitleCase(recipe.name)}
              </h1>
              {recipe.description && (
                <p className="text-white/80 text-sm mt-2 max-w-2xl leading-relaxed">
                  {recipe.description}
                </p>
              )}
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E8E6DC]">
            {recipe.totalTime && recipe.totalTime !== 'N/A' && (
              <div className="flex items-center gap-1.5 text-[#6E6A60]">
                <Clock className="w-4 h-4 text-[#C49A5C]" />
                <span className="text-sm font-medium">{recipe.totalTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[#6E6A60]">
              <Flame className="w-4 h-4 text-[#C49A5C]" />
              <span className="text-sm font-medium">{recipe.nutrition.calories} cal</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6E6A60]">
              <ChefHat className="w-4 h-4 text-[#C49A5C]" />
              <span className="text-sm font-medium">{recipe.difficulty}</span>
            </div>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-xs text-[#C49A5C] hover:text-[#8B6F3C] font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {recipe.sourceSite || 'Source'}
              </a>
            )}
          </div>

          {/* Enhanced Nutrition Section */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Calories</p>
                <p className="text-xl font-black text-[#C49A5C]">{recipe.nutrition.calories}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Protein</p>
                <p className="text-xl font-black text-[#1A1A1A]">{recipe.nutrition.protein}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Carbs</p>
                <p className="text-xl font-black text-[#1A1A1A]">{recipe.nutrition.carbs}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Fat</p>
                <p className="text-xl font-black text-[#1A1A1A]">{recipe.nutrition.fat}</p>
              </div>
            </div>

            {/* Macro Ratio Bar */}
            {totalMacroGrams > 0 && (
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-2">Macro Split</p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-[#C49A5C] rounded-l-full transition-all duration-500" style={{ width: `${proteinPct}%` }} />
                  <div className="bg-[#A8B590] transition-all duration-500" style={{ width: `${carbsPct}%` }} />
                  <div className="bg-[#E8E6DC] rounded-r-full transition-all duration-500" style={{ width: `${fatPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-[#6E6A60]">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#C49A5C] mr-1" />Protein {proteinPct}%</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#A8B590] mr-1" />Carbs {carbsPct}%</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#E8E6DC] mr-1 border border-[#d5d1c7]" />Fat {fatPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Two-Column: Ingredients + Steps on desktop */}
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
            {/* Ingredients */}
            {recipe.ingredients.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">Ingredients</h2>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <ul className="space-y-2.5">
                    {recipe.ingredients.map((ingredient, i) => (
                      <li key={i} className="flex items-start gap-3 text-[#3A3A3A]">
                        <span className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full border-2 border-[#C49A5C]/30" />
                        <span className="text-sm leading-relaxed">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Steps with step-tracking */}
            {recipe.steps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Instructions</h2>
                  <span className="text-xs text-[#6E6A60]">
                    {checkedSteps.size}/{recipe.steps.length} done
                  </span>
                </div>
                <ol className="space-y-3">
                  {recipe.steps.map((step, i) => (
                    <li
                      key={i}
                      onClick={() => toggleStep(i)}
                      className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                        checkedSteps.has(i)
                          ? 'bg-[#C49A5C]/8 opacity-60'
                          : 'bg-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <span className={`w-7 h-7 flex-shrink-0 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        checkedSteps.has(i)
                          ? 'bg-[#C49A5C] text-white'
                          : 'bg-[#F4F2EA] text-[#C49A5C]'
                      }`}>
                        {checkedSteps.has(i) ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <p className={`text-sm leading-relaxed pt-0.5 ${
                        checkedSteps.has(i) ? 'line-through text-[#6E6A60]' : 'text-[#3A3A3A]'
                      }`}>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Why It Works */}
          {recipe.whyItWorks && (
            <div className="mx-6 my-4 p-4 bg-[#C49A5C]/10 rounded-2xl border border-[#C49A5C]/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-[#C49A5C]" />
                <h3 className="text-sm font-bold text-[#C49A5C]">Why It Works</h3>
              </div>
              <p className="text-sm text-[#5A5548] leading-relaxed">{recipe.whyItWorks}</p>
            </div>
          )}

          {/* Bottom padding for action bar */}
          <div className="h-20" />
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#F4F2EA]/95 backdrop-blur-md border-t border-[#E8E6DC] px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => onToggleFavorite(recipe)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors btn-press ${
              isFavorite
                ? 'bg-red-50 text-red-500 border border-red-200'
                : 'bg-white text-[#6E6A60] border border-[#E8E6DC] hover:border-[#C49A5C]/40'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-400' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={() => onAddToPlanner(recipe)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors btn-press"
          >
            <Calendar className="w-4 h-4" />
            Add to Planner
          </button>

          <button
            onClick={() => onShareRecipe(recipe)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#6E6A60] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors btn-press"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#6E6A60] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors btn-press hidden sm:flex"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 text-[#6E6A60] text-sm font-medium hover:text-[#1A1A1A] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
