import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { normalizeScrapedRecipe } from '@/utils';
import type { SavedRecipe } from '@/types';

const RecipeDetailOverlay = lazy(() => import('@/components/RecipeDetailOverlay'));

export default function RecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';

    fetch(`${apiUrl}/api/recipes/public/${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) throw new Error('Recipe not found');
        return res.json();
      })
      .then(data => {
        setRecipe(normalizeScrapedRecipe(data.recipe, data.recipe.source || 'scraped'));
        setLoading(false);
      })
      .catch(() => {
        setError('Recipe not found');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#C49A5C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6E6A60]">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Recipe not found</h1>
          <p className="text-sm text-[#6E6A60] mb-6">This recipe may have been removed or the link is incorrect.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Go to Chickpea
          </button>
        </div>
      </div>
    );
  }

  const title = `${recipe.name} | chickpea`;
  const desc = recipe.description?.slice(0, 160) || `${recipe.name} recipe on chickpea.kitchen`;
  const img = recipe.image || 'https://chickpea.kitchen/og-image.png';
  const canonical = `https://chickpea.kitchen/recipe/${slug}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content={img} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={img} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      {createPortal(
        <Suspense fallback={null}>
          <RecipeDetailOverlay
            recipe={recipe}
            isFavorite={false}
            onToggleFavorite={() => {}}
            onAddToPlanner={() => {}}
            onShareRecipe={() => {}}
            onClose={() => navigate('/')}
          />
        </Suspense>,
        document.body
      )}
    </>
  );
}
