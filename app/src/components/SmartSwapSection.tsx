import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Leaf, ArrowRight, Search, X, Plus, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { swapCategories, smartSwaps } from '@/data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { trackEvent, EVENTS } from '@/utils/analytics';
import OptimizedImage from '@/components/OptimizedImage';
import type { Session } from '@supabase/supabase-js';
import type { Toast, UserProfile, CommunitySwap, SwapSuggestionForm } from '@/types';

interface SmartSwapSectionProps {
  substituteRef: React.RefObject<HTMLDivElement | null>;
  session: Session | null;
  userProfile: UserProfile | null;
  showToast: (message: string, type: Toast['type']) => void;
  onOpenAuth: () => void;
}

export default function SmartSwapSection({
  substituteRef,
  session,
  userProfile,
  showToast,
  onOpenAuth,
}: SmartSwapSectionProps) {
  const [activeSwapCategory, setActiveSwapCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [communitySwaps, setCommunitySwaps] = useState<CommunitySwap[]>([]);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch community swaps on mount ────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const fetchCommunitySwaps = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('swap_suggestions')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setCommunitySwaps(data as CommunitySwap[]);
        }
      } catch {
        // Silently fail — community swaps are optional
      }
    };

    fetchCommunitySwaps();
  }, []);

  // ── Merge static + community swaps ────────────────────────────
  const allSwaps = useMemo(() => {
    const staticTyped = smartSwaps.map(s => ({ ...s, isCommunity: false, display_name: '' }));
    const communityTyped = communitySwaps.map(s => ({
      original: s.original,
      swap: s.swap,
      category: s.category,
      note: s.note || '',
      ratio: s.ratio,
      isCommunity: true,
      display_name: s.display_name,
    }));
    return [...staticTyped, ...communityTyped];
  }, [communitySwaps]);

  // ── Filter by category + search ───────────────────────────────
  const filteredSwaps = useMemo(() => {
    let result = allSwaps;

    // Category filter
    if (activeSwapCategory !== 'all') {
      result = result.filter(s => s.category === activeSwapCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.original.toLowerCase().includes(q) ||
        s.swap.toLowerCase().includes(q) ||
        s.note.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allSwaps, activeSwapCategory, searchQuery]);

  // ── Search analytics (debounced) ──────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        trackEvent(EVENTS.SWAP_SEARCH, { query: value.trim() });
      }, 300);
    }
  }, []);

  // ── Submit suggestion ─────────────────────────────────────────
  const handleSubmitSuggestion = async (form: SwapSuggestionForm) => {
    if (!supabase || !session?.user) return;

    setSubmitting(true);
    try {
      const displayName = userProfile?.display_name || session.user.email?.split('@')[0] || 'Anonymous';

      const { data, error } = await supabase
        .from('swap_suggestions')
        .insert({
          user_id: session.user.id,
          display_name: displayName,
          original: form.original.trim(),
          swap: form.swap.trim(),
          category: form.category,
          note: form.note.trim(),
          ratio: form.ratio.trim() || '1:1',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state immediately
      if (data) {
        setCommunitySwaps(prev => [data as CommunitySwap, ...prev]);
      }

      trackEvent(EVENTS.SWAP_SUGGESTION_SUBMITTED, {
        original: form.original,
        swap: form.swap,
        category: form.category,
      });

      showToast('Swap suggestion added!', 'success');
      setShowSuggestModal(false);
    } catch {
      showToast('Could not submit suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Results label ─────────────────────────────────────────────
  const resultsLabel = searchQuery.trim()
    ? `${filteredSwaps.length} swap${filteredSwaps.length !== 1 ? 's' : ''} for "${searchQuery.trim()}"`
    : `${filteredSwaps.length} swap${filteredSwaps.length !== 1 ? 's' : ''}`;

  return (
    <section ref={substituteRef} className="section-pinned z-30">
      <div className="absolute inset-0 bg-warm-white" />

      {/* Left - Header + Category Filters + Search + Image */}
      <div className="substitute-image absolute left-[6vw] top-[14vh] w-[42vw] flex flex-col">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black lowercase text-[#1A1A1A] leading-none mb-3">
          Smart Swap
        </h2>
        <p className="text-[#6E6A60] text-lg leading-relaxed mb-5 max-w-[36vw]">
          Have dietary restrictions or just out of an ingredient? Select your need and we'll show you perfect swaps that keep flavor and texture intact.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {swapCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSwapCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeSwapCategory === cat.id
                  ? 'bg-[#C49A5C] text-white shadow-md'
                  : 'bg-white text-[#6E6A60] hover:bg-[#E8E6DC] border border-black/5'
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A60]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search ingredients..."
            className="w-full pl-10 pr-10 py-2.5 bg-white rounded-full text-sm text-[#1A1A1A] placeholder:text-[#A8A49A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6A60] hover:text-[#1A1A1A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Image */}
        <div className="h-[30vh] japandi-card">
          <OptimizedImage src="/substitute_eggs_dairy.jpg" alt="Ingredients" className="w-full h-full image-grade" />
        </div>
      </div>

      {/* Swap Badge */}
      <div className="substitute-badge absolute left-[10vw] bottom-[6vh] bg-[#C49A5C] text-white px-6 py-3 rounded-full font-semibold shadow-xl">
        <Leaf className="w-4 h-4 inline mr-2" />
        {activeSwapCategory === 'all' ? 'All dietary swaps' : swapCategories.find(c => c.id === activeSwapCategory)?.label + ' swaps active'}
      </div>

      {/* Right - Swap Cards */}
      <div className="substitute-text absolute left-[52vw] top-[14vh] w-[42vw] h-[76vh] overflow-y-auto pr-4 swap-scroll">
        {/* Results count + Suggest button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#6E6A60] font-medium">{resultsLabel}</span>
          {isSupabaseConfigured() && (
            session ? (
              <button
                onClick={() => setShowSuggestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#C49A5C] text-white rounded-full text-xs font-semibold hover:bg-[#8B6F3C] transition-colors btn-press"
              >
                <Plus className="w-3.5 h-3.5" />
                Suggest Swap
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#6E6A60] border border-black/5 rounded-full text-xs font-medium hover:bg-[#E8E6DC] transition-colors"
              >
                Sign in to suggest
              </button>
            )
          )}
        </div>

        {/* Swap cards or empty state */}
        {filteredSwaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-[#E8E6DC] rounded-full flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-[#C49A5C]" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">no swaps found</h3>
            <p className="text-sm text-[#6E6A60] max-w-xs leading-relaxed mb-4">
              Try a different search term or category filter.
            </p>
            {isSupabaseConfigured() && session && (
              <button
                onClick={() => setShowSuggestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#C49A5C] text-white rounded-full text-xs font-semibold hover:bg-[#8B6F3C] transition-colors btn-press"
              >
                <Plus className="w-3.5 h-3.5" />
                Suggest a swap
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSwaps.map((swap, idx) => (
              <div
                key={`${swap.original}-${swap.swap}-${idx}`}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-black/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#E8E6DC] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {swap.isCommunity ? (
                      <User className="w-5 h-5 text-[#C49A5C]" />
                    ) : (
                      <Leaf className="w-5 h-5 text-[#C49A5C]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1A1A1A]">{swap.original}</span>
                      <ArrowRight className="w-4 h-4 text-[#C49A5C]" />
                      <span className="font-semibold text-[#C49A5C]">{swap.swap}</span>
                    </div>
                    <p className="text-sm text-[#6E6A60] mt-1 leading-relaxed">{swap.note}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className="bg-[#E8E6DC] text-[#6E6A60] rounded-full text-xs border-0">
                        Ratio: {swap.ratio}
                      </Badge>
                      <Badge className="bg-[#C49A5C]/10 text-[#C49A5C] rounded-full text-xs border-0">
                        {swapCategories.find(c => c.id === swap.category)?.label}
                      </Badge>
                      {swap.isCommunity && (
                        <Badge className="bg-[#C49A5C]/15 text-[#8B6F3C] rounded-full text-xs border-0">
                          👤 {swap.display_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggest Swap Modal (via portal to escape GSAP transforms) */}
      {showSuggestModal && createPortal(
        <SuggestSwapModal
          onSubmit={handleSubmitSuggestion}
          onClose={() => setShowSuggestModal(false)}
          submitting={submitting}
        />,
        document.body
      )}
    </section>
  );
}

// ── Suggest Swap Modal ──────────────────────────────────────────

interface SuggestSwapModalProps {
  onSubmit: (form: SwapSuggestionForm) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
}

function SuggestSwapModal({ onSubmit, onClose, submitting }: SuggestSwapModalProps) {
  const [form, setForm] = useState<SwapSuggestionForm>({
    original: '',
    swap: '',
    category: 'dairy-free',
    note: '',
    ratio: '1:1',
  });

  // Close on Escape
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.original.trim() || !form.swap.trim()) return;
    onSubmit(form);
  };

  const categoryOptions = swapCategories.filter(c => c.id !== 'all');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative w-full max-w-md bg-[#F4F2EA] rounded-[24px] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#C49A5C]/15 rounded-full flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-[#C49A5C]" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Suggest a Swap</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[#6E6A60] hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original Ingredient */}
          <div>
            <label className="text-xs font-semibold text-[#6E6A60] uppercase tracking-wider mb-1.5 block">
              Original Ingredient
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={form.original}
              onChange={(e) => setForm(prev => ({ ...prev, original: e.target.value }))}
              placeholder="e.g. Heavy Cream"
              className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#A8A49A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all"
            />
          </div>

          {/* Swap Ingredient */}
          <div>
            <label className="text-xs font-semibold text-[#6E6A60] uppercase tracking-wider mb-1.5 block">
              Swap With
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={form.swap}
              onChange={(e) => setForm(prev => ({ ...prev, swap: e.target.value }))}
              placeholder="e.g. Coconut Cream"
              className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#A8A49A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all"
            />
          </div>

          {/* Category + Ratio row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6E6A60] uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-[#1A1A1A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all appearance-none cursor-pointer"
              >
                {categoryOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6E6A60] uppercase tracking-wider mb-1.5 block">
                Ratio
              </label>
              <input
                type="text"
                maxLength={20}
                value={form.ratio}
                onChange={(e) => setForm(prev => ({ ...prev, ratio: e.target.value }))}
                placeholder="1:1"
                className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#A8A49A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-[#6E6A60] uppercase tracking-wider mb-1.5 block">
              Note <span className="font-normal text-[#A8A49A]">({200 - form.note.length} chars left)</span>
            </label>
            <textarea
              maxLength={200}
              rows={3}
              value={form.note}
              onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Why does this swap work? Any tips?"
              className="w-full px-4 py-2.5 bg-white rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#A8A49A] border border-black/5 focus:border-[#C49A5C]/50 focus:ring-2 focus:ring-[#C49A5C]/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white text-[#6E6A60] border border-black/5 rounded-full text-sm font-semibold hover:bg-[#E8E6DC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.original.trim() || !form.swap.trim()}
              className="flex-1 px-4 py-2.5 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Swap'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
