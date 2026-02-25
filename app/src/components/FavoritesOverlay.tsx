import { X, Calendar, Clock, Heart, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedRecipe } from '@/types';
import { toTitleCase } from '@/utils';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface FavoritesOverlayProps {
  favorites: SavedRecipe[];
  onRemoveFavorite: (id: string) => void;
  onAddToPlanner: (recipe: SavedRecipe) => void;
  onClose: () => void;
}

export default function FavoritesOverlay({ favorites, onRemoveFavorite, onAddToPlanner, onClose }: FavoritesOverlayProps) {
  useBodyScrollLock();
  return (
    <div className="fixed inset-0 bg-[#F4F2EA]/98 backdrop-blur-sm z-[201] flex flex-col overflow-y-auto animate-overlay-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-black/5">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-400 fill-red-400" />
          <h2 className="text-2xl font-black uppercase text-[#1A1A1A]">Saved Recipes</h2>
          <span className="text-sm text-[#6E6A60]">({favorites.length})</span>
        </div>
        <Button onClick={onClose} variant="outline" className="rounded-full h-10 w-10 p-0 flex items-center justify-center">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {favorites.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              {/* Inline illustration — empty plate with heart */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <ellipse cx="64" cy="80" rx="52" ry="16" fill="#E8E6DC" />
                  <ellipse cx="64" cy="76" rx="52" ry="16" fill="#F4F2EA" stroke="#E8E6DC" strokeWidth="2" />
                  <ellipse cx="64" cy="76" rx="36" ry="10" fill="white" stroke="#E8E6DC" strokeWidth="1.5" />
                  <path d="M64 46 C64 40, 56 37, 56 43 C56 49, 64 54, 64 54 C64 54, 72 49, 72 43 C72 37, 64 40, 64 46Z" fill="#C49A5C" opacity="0.5" className="animate-float" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">your recipe box is empty</h3>
              <p className="text-[#6E6A60] text-sm leading-relaxed">
                Tap the <Heart className="w-3.5 h-3.5 inline text-red-400 fill-red-400 -mt-0.5" /> on any recipe to save it here for easy access later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favorites.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-[24px] overflow-hidden shadow-lg group card-hover">
                  <div className="relative h-44 overflow-hidden">
                    <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover image-grade" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      onClick={() => onRemoveFavorite(recipe.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-red-400 hover:bg-black/50 transition-colors"
                    >
                      <Heart className="w-4 h-4 fill-red-400" />
                    </button>
                    {recipe.sourceSite && (
                      <span className="absolute top-3 left-3 text-[10px] text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                        {recipe.sourceSite}
                      </span>
                    )}
                    {!recipe.sourceSite && recipe.source && (
                      <span className="absolute top-3 left-3 text-[10px] text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium capitalize">
                        {recipe.source}
                      </span>
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white leading-snug">{toTitleCase(recipe.name)}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    {recipe.description && (
                      <p className="text-xs text-[#6E6A60] line-clamp-2 mb-3 leading-relaxed">{recipe.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#6E6A60] mb-3">
                      {recipe.nutrition.calories > 0 && (
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.nutrition.calories} cal</span>
                      )}
                      {recipe.totalTime !== 'N/A' && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.totalTime}</span>
                      )}
                      {recipe.nutrition.protein !== '0g' && (
                        <span>P: {recipe.nutrition.protein}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onAddToPlanner(recipe)}
                        className="flex-1 bg-[#C49A5C] text-white rounded-full text-xs hover:bg-[#8B6F3C] btn-press"
                        size="sm"
                      >
                        <Calendar className="w-3 h-3 mr-1" /> Add to Plan
                      </Button>
                      <Button
                        onClick={() => onRemoveFavorite(recipe.id)}
                        variant="outline"
                        className="rounded-full text-xs"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
