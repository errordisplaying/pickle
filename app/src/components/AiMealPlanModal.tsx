import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { NutritionGoals, SavedRecipe, Toast } from '@/types';

interface AiMealPlanModalProps {
  nutritionGoals: NutritionGoals;
  availableRecipes: SavedRecipe[];
  onApplyPlan: (plan: Record<string, { breakfast: string | null; lunch: string | null; dinner: string | null }>) => void;
  onClose: () => void;
  showToast: (message: string, type: Toast['type']) => void;
}

export default function AiMealPlanModal({
  nutritionGoals,
  availableRecipes,
  onApplyPlan,
  onClose,
  showToast,
}: AiMealPlanModalProps) {
  const [preferences, setPreferences] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    // Build compact recipe summaries for the API
    const recipeSummaries = availableRecipes.map(r => ({
      name: r.name,
      calories: r.nutrition.calories,
      protein: r.nutrition.protein,
      carbs: r.nutrition.carbs,
      fat: r.nutrition.fat,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      tags: r.tags,
    }));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/ai/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: preferences.trim(),
          nutritionGoals,
          recipes: recipeSummaries,
        }),
      });

      if (res.status === 429) {
        setError('Too many requests. Please wait a moment.');
        return;
      }
      if (!res.ok) {
        setError('Could not generate plan. Please try again.');
        return;
      }

      const data = await res.json();
      if (data.plan) {
        onApplyPlan(data.plan);
        showToast('AI meal plan applied!', 'success');
      } else {
        setError('Unexpected response. Please try again.');
      }
    } catch {
      setError('Could not reach AI service. Check your connection.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[260] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[24px] max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C49A5C]/10 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#C49A5C]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1A1A1A]">AI Meal Planner</h3>
              <p className="text-xs text-[#6E6A60]">Describe your preferences and we'll plan your week</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4F2EA] flex items-center justify-center hover:bg-[#E8E6DC] transition-colors">
            <X className="w-4 h-4 text-[#6E6A60]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Preferences */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              What are you looking for this week?
            </label>
            <Textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g., high protein, under 30 min, include chicken, no seafood..."
              className="bg-[#F4F2EA] border-0 rounded-xl resize-none min-h-[80px] text-sm"
              maxLength={500}
            />
          </div>

          {/* Current goals display */}
          <div className="bg-[#F4F2EA] rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-2 font-medium">Daily Targets</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-[#C49A5C]">{nutritionGoals.calories}</p>
                <p className="text-[10px] text-[#6E6A60]">kcal</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{nutritionGoals.protein}g</p>
                <p className="text-[10px] text-[#6E6A60]">protein</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{nutritionGoals.carbs}g</p>
                <p className="text-[10px] text-[#6E6A60]">carbs</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{nutritionGoals.fat}g</p>
                <p className="text-[10px] text-[#6E6A60]">fat</p>
              </div>
            </div>
          </div>

          {/* Recipe pool info */}
          <p className="text-xs text-[#8B8579]">
            {availableRecipes.length} recipes available
            {availableRecipes.length < 7 && (
              <span className="text-amber-500 ml-1">
                — save more recipes for better results
              </span>
            )}
          </p>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || availableRecipes.length === 0}
            className="w-full bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full text-sm disabled:opacity-50 btn-press"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Planning your week...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Meal Plan
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
