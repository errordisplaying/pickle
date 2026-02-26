import { useEffect, useState, useRef } from 'react';
import { X, Download, Copy, Share2, ExternalLink, FileText } from 'lucide-react';
import { generateRecipeCard, formatRecipeShareText, toTitleCase } from '@/utils';
import type { SavedRecipe, Toast } from '@/types';

interface ShareCardModalProps {
  recipe: SavedRecipe;
  onClose: () => void;
  showToast: (message: string, type: Toast['type']) => void;
}

export default function ShareCardModal({ recipe, onClose, showToast }: ShareCardModalProps) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(true);
  const blobUrlRef = useRef<string | null>(null);

  // Generate card on mount
  useEffect(() => {
    let cancelled = false;

    generateRecipeCard(recipe)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setCardUrl(url);
        setCardBlob(blob);
        setGenerating(false);
      })
      .catch(() => {
        if (cancelled) return;
        setGenerating(false);
        showToast('Could not generate share card', 'error');
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [recipe, showToast]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-chickpea.png`;
    a.click();
    showToast('Card downloaded!', 'success');
  };

  const handleCopyImage = async () => {
    if (!cardBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': cardBlob }),
      ]);
      showToast('Image copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy image — try downloading instead.', 'warning');
    }
  };

  const handleNativeShare = async () => {
    if (!cardBlob) return;
    const file = new File([cardBlob], 'recipe-card.png', { type: 'image/png' });
    try {
      await navigator.share({
        title: toTitleCase(recipe.name),
        text: formatRecipeShareText(recipe),
        files: [file],
      });
      showToast('Shared successfully!', 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast('Share cancelled or unavailable.', 'info');
      }
    }
  };

  const handleCopyText = async () => {
    const text = formatRecipeShareText(recipe);
    await navigator.clipboard.writeText(text);
    showToast('Recipe text copied to clipboard!', 'success');
  };

  const recipeName = toTitleCase(recipe.name);
  const shareUrl = recipe.sourceUrl || 'https://chickpea.kitchen';
  const shareText = encodeURIComponent(`${recipeName} — found on chickpea.kitchen`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[560px] bg-[#F4F2EA] rounded-[24px] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-[#1A1A1A]">Share Recipe</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#E8E6DC] hover:bg-[#DDD9CE] transition-colors"
          >
            <X className="w-4 h-4 text-[#6E6A60]" />
          </button>
        </div>

        {/* Card preview */}
        <div className="px-6 pb-4">
          <div className="rounded-[16px] overflow-hidden shadow-md border border-[#E8E6DC] bg-white">
            {generating ? (
              <div className="flex items-center justify-center h-[180px] text-[#8B8579]">
                <div className="w-6 h-6 border-2 border-[#C49A5C] border-t-transparent rounded-full animate-spin mr-3" />
                Generating card...
              </div>
            ) : cardUrl ? (
              <img
                src={cardUrl}
                alt={`Share card for ${recipeName}`}
                className="w-full h-auto"
              />
            ) : (
              <div className="flex items-center justify-center h-[180px] text-[#8B8579]">
                Could not generate preview
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            disabled={!cardUrl}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors disabled:opacity-40 btn-press"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!cardBlob}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1A1A1A] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors disabled:opacity-40 btn-press"
          >
            <Copy className="w-4 h-4" />
            Copy Image
          </button>

          {canShare && (
            <button
              onClick={handleNativeShare}
              disabled={!cardBlob}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1A1A1A] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors disabled:opacity-40 btn-press"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}

          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#6E6A60] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors btn-press"
          >
            <FileText className="w-4 h-4" />
            Copy Text
          </button>
        </div>

        {/* Social platform links */}
        <div className="px-6 pb-6">
          <p className="text-xs text-[#8B8579] mb-2 font-medium uppercase tracking-wider">Share to</p>
          <div className="flex gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}&hashtags=chickpea`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-full text-sm font-semibold hover:bg-[#1DA1F2]/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Twitter
            </a>
            <a
              href={`https://wa.me/?text=${shareText}%20${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366]/10 text-[#25D366] rounded-full text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <a
              href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E60023]/10 text-[#E60023] rounded-full text-sm font-semibold hover:bg-[#E60023]/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pinterest
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
