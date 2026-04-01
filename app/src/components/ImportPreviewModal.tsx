import { useState } from 'react';
import { X, Clock, ChefHat, UtensilsCrossed, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedRecipe } from '@/types';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import OptimizedImage from '@/components/OptimizedImage';

interface ImportPreviewModalProps {
  recipe: SavedRecipe;
  onConfirm: (recipe: SavedRecipe) => void;
  onCancel: () => void;
}

export default function ImportPreviewModal({ recipe, onConfirm, onCancel }: ImportPreviewModalProps) {
  const [editName, setEditName] = useState(recipe.name);
  const [closing, setClosing] = useState(false);

  useBodyScrollLock();
  const trapRef = useFocusTrap(() => handleCancel());

  const handleCancel = () => {
    setClosing(true);
    setTimeout(onCancel, 250);
  };

  const handleConfirm = () => {
    setClosing(true);
    setTimeout(() => onConfirm({ ...recipe, name: editName }), 250);
  };

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Preview imported recipe"
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[210] flex items-center justify-center p-4 ${closing ? 'animate-overlay-out' : 'animate-overlay-in'}`}
    >
      <div className="bg-[#F4F2EA] rounded-[28px] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Image */}
        {recipe.image && (
          <div className="relative h-48 overflow-hidden">
            <OptimizedImage
              src={recipe.image}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Editable name */}
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full text-xl font-black text-[#1A1A1A] bg-transparent border-b-2 border-[#E8E6DC] focus:border-[#C49A5C] focus:outline-none pb-1 mb-4 transition-colors"
            placeholder="Recipe name"
          />

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.totalTime && (
              <span className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-full border border-[#E8E6DC] text-[#6E6A60]">
                <Clock className="w-3 h-3" /> {recipe.totalTime}
              </span>
            )}
            {recipe.ingredients.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-full border border-[#E8E6DC] text-[#6E6A60]">
                <UtensilsCrossed className="w-3 h-3" /> {recipe.ingredients.length} ingredients
              </span>
            )}
            {recipe.steps.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-full border border-[#E8E6DC] text-[#6E6A60]">
                <ChefHat className="w-3 h-3" /> {recipe.steps.length} steps
              </span>
            )}
            {recipe.nutrition.calories > 0 && (
              <span className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-full border border-[#E8E6DC] text-[#6E6A60]">
                <Flame className="w-3 h-3" /> {recipe.nutrition.calories} cal
              </span>
            )}
          </div>

          {/* Description preview */}
          {recipe.description && (
            <p className="text-sm text-[#6E6A60] leading-relaxed mb-4 line-clamp-3">
              {recipe.description}
            </p>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {recipe.tags.slice(0, 5).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#C49A5C]/10 text-[#C49A5C] font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {recipe.sourceSite && (
            <p className="text-[10px] text-[#6E6A60] mb-4">
              Source: {recipe.sourceSite}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full btn-press"
            >
              Save to Collection
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
