import { useDraggable } from '@dnd-kit/core';
import { UtensilsCrossed, ChevronRight } from 'lucide-react';
import type { SavedRecipe } from '@/types';
import { toTitleCase } from '@/utils';

interface DraggableRecipeCardProps {
  recipe: SavedRecipe;
  index: number;
  isSelected: boolean;
  onSelect: (recipe: SavedRecipe) => void;
}

export default function DraggableRecipeCard({ recipe, index, isSelected, onSelect }: DraggableRecipeCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-recipe-${recipe.id || index}`,
    data: { recipe },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(recipe)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all duration-150 ${
        isDragging ? 'opacity-40' :
        isSelected ? 'bg-[#C49A5C]/10 ring-1 ring-[#C49A5C]/30 shadow-sm' : 'hover:bg-[#F4F2EA]'
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
  );
}
