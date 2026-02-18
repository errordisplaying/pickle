import { Clock, Flame, Heart, Star, Sparkles } from 'lucide-react';
import { toTitleCase } from '@/utils';
import type { SavedRecipe, ScoredRecipe } from '@/types';

interface GallerySectionProps {
  galleryRef: React.RefObject<HTMLDivElement | null>;
  recipes: ScoredRecipe[];
  onToggleFavorite: (recipe: SavedRecipe) => void;
  isFavorite: (name: string) => boolean;
  onOpenRecipe: (recipe: SavedRecipe) => void;
}

const TAG_ICONS: Record<string, typeof Star> = {
  Quick: Clock,
  Seafood: Sparkles,
  Pasta: Sparkles,
  Classic: Star,
  Budget: Sparkles,
  Vegetarian: Sparkles,
  Healthy: Sparkles,
  Comfort: Star,
  Asian: Sparkles,
  Protein: Sparkles,
  Spicy: Flame,
};

export default function GallerySection({ galleryRef, recipes, onToggleFavorite, isFavorite, onOpenRecipe }: GallerySectionProps) {
  return (
    <section ref={galleryRef} className="section-pinned z-20">
      <div className="absolute inset-0 bg-warm-white" />

      {/* Header */}
      <div className="gallery-text absolute left-[6vw] top-[12vh] z-10">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black uppercase text-[#1A1A1A] leading-none mb-3">
          Recipes For You
        </h2>
        <p className="text-[#6E6A60] text-lg leading-relaxed max-w-xl">
          Personalized picks based on your taste. Click a card to see the full recipe.
        </p>
      </div>

      {/* Horizontal Scrolling Card Slider */}
      <div className="gallery-cards absolute left-0 right-0 top-[30vh] bottom-[6vh] overflow-x-auto overflow-y-hidden px-[6vw] recipe-slider">
        <div className="flex gap-5 h-full w-max py-2">
          {recipes.map((scored, idx) => {
            const recipe = scored.recipe;
            const normalized = scored.normalized;
            const primaryTag = (recipe.tags || [])[0] || 'Pick';
            const TagIcon = TAG_ICONS[primaryTag] || Star;

            return (
              <div
                key={idx}
                onClick={() => onOpenRecipe(normalized)}
                className="gallery-card group relative w-[260px] h-full flex-shrink-0 rounded-[28px] overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
              >
                {/* Hero Image */}
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="absolute inset-0 w-full h-full object-cover image-grade transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay — always visible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Badge — top left */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#8B7355]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full z-10">
                  <TagIcon className="w-3 h-3" />
                  <span className="text-[11px] font-semibold">{primaryTag}</span>
                </div>

                {/* Favorite heart — top right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(normalized);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-all z-10"
                >
                  <Heart className={`w-4 h-4 ${isFavorite(recipe.name) ? 'fill-red-400 text-red-400' : ''}`} />
                </button>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Recipe name */}
                  <h3 className="font-bold text-white text-lg leading-tight mb-2 drop-shadow-md">
                    {toTitleCase(recipe.name)}
                  </h3>

                  {/* Metadata row */}
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.time}</span>
                    </div>
                    <span className="text-white/40">|</span>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      <span>{recipe.calories} cal</span>
                    </div>
                    <span className="text-white/40">|</span>
                    <span>{recipe.difficulty}</span>
                  </div>

                  {/* Personalization reason */}
                  <div className="border-t border-white/20 pt-2">
                    <p className="text-white/60 text-[11px] font-medium truncate">
                      {scored.reason}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
