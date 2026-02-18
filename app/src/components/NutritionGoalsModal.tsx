import { Target, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { NutritionGoals } from '@/types';
import { DEFAULT_NUTRITION_GOALS } from '@/constants';

interface NutritionGoalsModalProps {
  nutritionGoals: NutritionGoals;
  onUpdateGoals: (goals: NutritionGoals) => void;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

const NutritionGoalsModal = ({ nutritionGoals, onUpdateGoals, onClose, showToast }: NutritionGoalsModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[260] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[24px] max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B7355]/10 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 text-[#8B7355]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1A1A1A]">Daily Nutrition Goals</h3>
              <p className="text-xs text-[#6E6A60]">Set your daily macro targets</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4F2EA] flex items-center justify-center hover:bg-[#E8E6DC] transition-colors">
            <X className="w-4 h-4 text-[#6E6A60]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {([
            { field: 'calories' as const, label: 'Calories', unit: 'kcal', icon: '🔥' },
            { field: 'protein' as const, label: 'Protein', unit: 'g', icon: '💪' },
            { field: 'carbs' as const, label: 'Carbs', unit: 'g', icon: '🍞' },
            { field: 'fat' as const, label: 'Fat', unit: 'g', icon: '🥑' },
          ]).map(({ field, label, unit, icon }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                {icon} {label} ({unit}/day)
              </label>
              <Input
                type="number"
                value={nutritionGoals[field]}
                onChange={(e) => onUpdateGoals({ ...nutritionGoals, [field]: parseInt(e.target.value) || 0 })}
                className="bg-[#F4F2EA] border-0 rounded-xl"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => { onUpdateGoals(DEFAULT_NUTRITION_GOALS); showToast('Goals reset to defaults', 'info'); }}
              variant="outline"
              className="flex-1 rounded-full text-sm"
            >
              Reset Defaults
            </Button>
            <Button
              onClick={() => { onClose(); showToast('Goals saved!', 'success'); }}
              className="flex-1 bg-[#8B7355] text-white hover:bg-[#6B5740] rounded-full text-sm"
            >
              Save Goals
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionGoalsModal;
