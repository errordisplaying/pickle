import { UtensilsCrossed } from 'lucide-react';
import type { SavedRecipe } from '@/types';
import { toTitleCase } from '@/utils';

interface DragOverlayContentProps {
  recipe: SavedRecipe;
}

export default function DragOverlayContent({ recipe }: DragOverlayContentProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-xl border border-[#C49A5C]/30 w-[260px] pointer-events-none">
      {recipe.image ? (
        <img src={recipe.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-[#F4F2EA] flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="w-5 h-5 text-[#C49A5C]/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1A1A1A] truncate">{toTitleCase(recipe.name)}</p>
        {recipe.nutrition.calories > 0 && (
          <p className="text-[10px] text-[#6E6A60]">{recipe.nutrition.calories} cal</p>
        )}
      </div>
    </div>
  );
}
