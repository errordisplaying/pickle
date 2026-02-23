import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Beaker, Clock, X, Plus,
  Heart, ArrowRight, Send,
  Flame, UtensilsCrossed, BadgeCheck,
  Share2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { SavedRecipe, DietaryFilter, ChatMessage } from '@/types';
import { DIETARY_FILTERS, SERVING_MULTIPLIERS } from '@/constants';
import { normalizeScrapedRecipe, toTitleCase, scaleNutrition } from '@/utils';
import { trackEvent, EVENTS } from '@/utils/analytics';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
  mode: 'recipe' | 'testKitchen';
  setMode: (mode: 'recipe' | 'testKitchen') => void;
  ingredients: string;
  setIngredients: (val: string) => void;
  timeAvailable: string;
  setTimeAvailable: (val: string) => void;
  cuisine: string;
  setCuisine: (val: string) => void;
  strictness: string;
  setStrictness: (val: string) => void;
  loading: boolean;
  activeDietaryFilters: DietaryFilter[];
  onToggleDietaryFilter: (filter: DietaryFilter) => void;
  onFindRecipes: () => void;
  recipeData: any;
  expandedRecipe: number | null;
  setExpandedRecipe: (idx: number | null) => void;
  onCloseResults: () => void;
  servingMultiplier: number;
  setServingMultiplier: (mult: number) => void;
  onToggleFavorite: (recipe: SavedRecipe) => void;
  isFavorite: (name: string) => boolean;
  onShareRecipe: (recipe: any) => void;
  onAddToPlanner: (recipe: SavedRecipe) => void;
}

const headlines = ['cook with what you have.', 'waste less, eat better.', 'your kitchen, simplified.'];

export default function HeroSection({
  heroRef,
  mode,
  setMode,
  ingredients,
  setIngredients,
  timeAvailable,
  setTimeAvailable,
  cuisine,
  setCuisine,
  strictness,
  setStrictness,
  loading,
  activeDietaryFilters,
  onToggleDietaryFilter,
  onFindRecipes,
  recipeData,
  expandedRecipe,
  setExpandedRecipe,
  onCloseResults,
  servingMultiplier,
  setServingMultiplier,
  onToggleFavorite,
  isFavorite,
  onShareRecipe,
  onAddToPlanner,
}: HeroSectionProps) {
  // ── Local State: Animated headline ─────────────────────────────
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Local State: Test Kitchen ──────────────────────────────────
  const [tkDishName, setTkDishName] = useState('');
  const [tkIngredients, setTkIngredients] = useState<string[]>([]);
  const [tkActive, setTkActive] = useState(false);
  const [tkMessages, setTkMessages] = useState<ChatMessage[]>([]);
  const [tkInput, setTkInput] = useState('');
  const [tkLoading, setTkLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tkMessages.length, tkLoading]);

  // ── Local Functions ────────────────────────────────────────────
  const addIngredientChip = () => {
    if (!ingredients.trim()) return;
    const items = ingredients.split(/[\n,]|(?:\s+and\s+)/gi)
      .map(item => item.trim())
      .filter(Boolean);
    setTkIngredients(prev => [...new Set([...prev, ...items])]);
    setIngredients('');
  };

  const removeIngredientChip = (ingredient: string) => {
    setTkIngredients(prev => prev.filter(i => i !== ingredient));
  };

  const startTestKitchen = () => {
    if (!tkDishName.trim() || tkIngredients.length === 0) return;
    setTkActive(true);
    setTkMessages([{
      role: 'assistant',
      content: `Hey! I'm here to help you cook ${tkDishName}. Ask me anything — substitutions, technique, timing, or flavor adjustments. Let's cook!`,
      timestamp: Date.now(),
    }]);
  };

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || tkLoading) return;

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    setTkMessages(prev => [...prev, userMsg]);
    setTkInput('');
    setTkLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const allMessages = [...tkMessages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: { dishName: tkDishName, ingredients: tkIngredients },
        }),
      });

      if (res.status === 429) {
        setTkMessages(prev => [...prev, { role: 'system', content: 'Too many messages — give me a sec!', timestamp: Date.now() }]);
      } else if (!res.ok) {
        setTkMessages(prev => [...prev, { role: 'system', content: 'Chickpea is taking a break. Try again in a moment.', timestamp: Date.now() }]);
      } else {
        const data = await res.json();
        setTkMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: Date.now() }]);
      }

      trackEvent(EVENTS.TEST_KITCHEN_MESSAGE, { dishName: tkDishName });
    } catch {
      setTkMessages(prev => [...prev, { role: 'system', content: 'Could not reach Chickpea. Check your connection.', timestamp: Date.now() }]);
    } finally {
      setTkLoading(false);
    }
  }, [tkMessages, tkDishName, tkIngredients, tkLoading]);

  const endTestKitchen = () => {
    setTkActive(false);
    setTkDishName('');
    setTkIngredients([]);
    setTkMessages([]);
    setTkInput('');
  };

  return (
    <section ref={heroRef} className="section-pinned z-10">
      <div className="absolute inset-0 bg-warm-white" />

      {/* Hero Image Card with Headline Overlay */}
      <div className="hero-image absolute left-[6vw] top-[14vh] w-[58vw] h-[72vh] japandi-card">
        <img
          src="/hero_search_preview.jpg"
          alt="chickpea search preview"
          className="w-full h-full object-cover image-grade"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-[28px]" />

        {/* Headline on image */}
        <div className="hero-headline absolute bottom-8 left-8 right-8 z-20">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black lowercase text-white leading-none relative h-[1.1em] overflow-hidden drop-shadow-lg">
            {headlines.map((text, i) => (
              <span
                key={text}
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                  i === headlineIndex
                    ? 'opacity-100 translate-y-0'
                    : i === (headlineIndex + 2) % 3
                    ? 'opacity-0 -translate-y-full'
                    : 'opacity-0 translate-y-full'
                }`}
              >
                {text}
              </span>
            ))}
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border border-white/20 rounded-full px-4 py-1.5">
              <BadgeCheck className="w-4 h-4 mr-1" /> 100% Free
            </Badge>
            <span className="text-white/80 text-sm">No subscription. No credit card required.</span>
          </div>
        </div>
      </div>

      {/* Input Panel */}
      <div className="hero-panel absolute left-[66vw] top-[20vh] w-[28vw] min-w-[320px] bg-warm-white border border-black/5 rounded-[28px] p-6 shadow-xl">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('recipe')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold transition-all ${
              mode === 'recipe'
                ? 'bg-[#C49A5C] text-white'
                : 'bg-[#E8E6DC] text-[#1A1A1A] hover:bg-[#ddd9cc]'
            }`}
          >
            <Search className="w-4 h-4" /> Find Recipes
          </button>
          <button
            onClick={() => setMode('testKitchen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold transition-all ${
              mode === 'testKitchen'
                ? 'bg-[#C49A5C] text-white'
                : 'bg-[#E8E6DC] text-[#1A1A1A] hover:bg-[#ddd9cc]'
            }`}
          >
            <Beaker className="w-4 h-4" /> Test Kitchen
          </button>
        </div>

        {mode === 'recipe' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                What's in your kitchen?
              </label>
              <Textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="e.g., eggs, spinach, rice, lime..."
                className="bg-white border-[#E8E6DC] rounded-2xl resize-none min-h-[80px] text-sm"
              />
              <p className="text-xs text-[#6E6A60] mt-1">
                Tip: Just type naturally — "eggs milk cheese" works
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Ingredient Flexibility
              </label>
              <select
                value={strictness}
                onChange={(e) => setStrictness(e.target.value)}
                className="w-full bg-white border border-[#E8E6DC] rounded-2xl px-4 py-3 text-sm"
              >
                <option value="strict">Strict — Only use ingredients I listed</option>
                <option value="flexible">Flexible — Can add pantry staples</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Time</label>
                <Input
                  value={timeAvailable}
                  onChange={(e) => setTimeAvailable(e.target.value)}
                  placeholder="30 min..."
                  className="bg-white border-[#E8E6DC] rounded-2xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Cuisine</label>
                <Input
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Any..."
                  className="bg-white border-[#E8E6DC] rounded-2xl text-sm"
                />
              </div>
            </div>

            {/* Dietary Filters */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Dietary Preferences</label>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_FILTERS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => onToggleDietaryFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeDietaryFilters.includes(filter)
                        ? 'bg-[#C49A5C] text-white shadow-sm'
                        : 'bg-[#E8E6DC] text-[#6E6A60] hover:bg-[#ddd9cc]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={onFindRecipes}
              disabled={loading || !ingredients.trim()}
              className="w-full japandi-button bg-[#C49A5C] text-white hover:bg-[#8B6F3C] disabled:opacity-50 btn-press"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cooking up suggestions...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" /> Find Recipes
                </span>
              )}
            </Button>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-[#E8E6DC] text-[#6E6A60] hover:bg-[#ddd9cc] cursor-pointer rounded-full">
                Clear fridge
              </Badge>
              <Badge variant="secondary" className="bg-[#E8E6DC] text-[#6E6A60] hover:bg-[#ddd9cc] cursor-pointer rounded-full">
                High protein
              </Badge>
              <Badge variant="secondary" className="bg-[#E8E6DC] text-[#6E6A60] hover:bg-[#ddd9cc] cursor-pointer rounded-full">
                Under 30 min
              </Badge>
            </div>
          </div>
        ) : !tkActive ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Dish Name</label>
              <Input
                value={tkDishName}
                onChange={(e) => setTkDishName(e.target.value)}
                placeholder="e.g., Spicy Tomato Pasta"
                className="bg-white border-[#E8E6DC] rounded-2xl text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Available Ingredients</label>
              <div className="flex gap-2">
                <Input
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIngredientChip()}
                  placeholder="Type and press Enter"
                  className="bg-white border-[#E8E6DC] rounded-2xl text-sm flex-1"
                />
                <Button onClick={addIngredientChip} className="bg-[#C49A5C] text-white rounded-full px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {tkIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tkIngredients.map((ing, idx) => (
                  <Badge key={idx} className="bg-[#E8E6DC] text-[#1A1A1A] rounded-full px-3 py-1">
                    {ing}
                    <button onClick={() => removeIngredientChip(ing)} className="ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Button
              onClick={startTestKitchen}
              disabled={!tkDishName || tkIngredients.length === 0}
              className="w-full japandi-button bg-[#C49A5C] text-white hover:bg-[#8B6F3C] disabled:opacity-50"
            >
              <Beaker className="w-4 h-4 mr-2" /> Start Test Kitchen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Session header */}
            <div className="bg-[#C49A5C] rounded-2xl p-3 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <Beaker className="w-4 h-4" />
                <span className="text-xs font-medium opacity-80">Test Kitchen Active</span>
              </div>
              <h3 className="font-bold text-sm">{tkDishName}</h3>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tkIngredients.map((ing, idx) => (
                  <span key={idx} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{ing}</span>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="bg-[#E8E6DC] rounded-2xl p-3 max-h-[280px] overflow-y-auto space-y-2.5">
              {tkMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#C49A5C] text-white rounded-br-md'
                        : msg.role === 'system'
                        ? 'bg-[#F4F2EA] text-[#C49A5C] italic border border-[#C49A5C]/20 rounded-bl-md'
                        : 'bg-white text-[#1A1A1A] shadow-sm rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {tkLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-[#6E6A60] px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#C49A5C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C49A5C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C49A5C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <div className="flex gap-2">
              <Input
                value={tkInput}
                onChange={(e) => setTkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(tkInput)}
                placeholder="Ask Chickpea anything..."
                className="bg-white border-[#E8E6DC] rounded-2xl text-sm flex-1"
                disabled={tkLoading}
              />
              <Button
                onClick={() => sendMessage(tkInput)}
                disabled={tkLoading || !tkInput.trim()}
                className="bg-[#C49A5C] text-white rounded-full px-3 btn-press"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => sendMessage('What temperature should I cook this at?')} className="text-xs bg-white text-[#6E6A60] px-3 py-1.5 rounded-full hover:bg-[#E8E6DC] border border-black/5 transition-colors">What temp?</button>
              <button onClick={() => sendMessage('What substitutions can I make?')} className="text-xs bg-white text-[#6E6A60] px-3 py-1.5 rounded-full hover:bg-[#E8E6DC] border border-black/5 transition-colors">Substitutions?</button>
              <button onClick={() => sendMessage('How should I time the different parts of this dish?')} className="text-xs bg-white text-[#6E6A60] px-3 py-1.5 rounded-full hover:bg-[#E8E6DC] border border-black/5 transition-colors">Timing</button>
              <button onClick={() => sendMessage('How can I make this dish healthier?')} className="text-xs bg-white text-[#6E6A60] px-3 py-1.5 rounded-full hover:bg-[#E8E6DC] border border-black/5 transition-colors">Healthier</button>
            </div>

            <Button onClick={endTestKitchen} variant="outline" className="w-full rounded-full text-sm">
              End Session
            </Button>
          </div>
        )}
      </div>

      {/* Loading Skeleton Overlay */}
      {loading && !recipeData && (
        <div className="absolute inset-0 bg-[#F4F2EA]/95 backdrop-blur-sm z-30 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="max-w-6xl w-full">
            <div className="mb-8 py-4 px-2">
              <Skeleton className="h-9 w-72 bg-[#E8E6DC] rounded-2xl mb-2" />
              <Skeleton className="h-4 w-48 bg-[#E8E6DC] rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-[28px] overflow-hidden shadow-md">
                  <Skeleton className="h-48 w-full bg-[#E8E6DC]" style={{ borderRadius: 0 }} />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4 bg-[#E8E6DC] rounded-xl" />
                    <Skeleton className="h-3 w-full bg-[#E8E6DC] rounded-lg" />
                    <Skeleton className="h-3 w-5/6 bg-[#E8E6DC] rounded-lg" />
                    <div className="flex gap-3 pt-2">
                      <Skeleton className="h-6 w-16 bg-[#E8E6DC] rounded-full" />
                      <Skeleton className="h-6 w-20 bg-[#E8E6DC] rounded-full" />
                      <Skeleton className="h-6 w-14 bg-[#E8E6DC] rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Results Overlay */}
      {recipeData && (
        <div className="absolute inset-0 bg-[#F4F2EA]/95 backdrop-blur-sm z-30 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="max-w-6xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#F4F2EA]/90 backdrop-blur-md py-4 px-2 -mx-2 z-10 rounded-2xl">
              <div>
                <h2 className="text-3xl font-black uppercase text-[#1A1A1A]">Here's What I Found</h2>
                {recipeData.source === 'scraped' && (
                  <p className="text-sm text-[#C49A5C] mt-1 font-medium">Scraped from top cooking websites</p>
                )}
                {recipeData.source === 'demo' && (
                  <p className="text-sm text-[#6E6A60] mt-1">Showing suggested recipes</p>
                )}
              </div>
              <Button onClick={onCloseResults} variant="outline" className="rounded-full h-10 w-10 p-0 flex items-center justify-center">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Expanded Recipe Detail View */}
            {expandedRecipe !== null && recipeData.recipes[expandedRecipe] && (
              <div className="mb-8 bg-white rounded-[28px] overflow-hidden shadow-2xl animate-in fade-in duration-300">
                {(() => {
                  const recipe = recipeData.recipes[expandedRecipe];
                  return (
                    <>
                      <div className="relative h-56 sm:h-72">
                        <img src={recipe.image} alt={recipe.name} loading="lazy" decoding="async" className="w-full h-full object-cover image-grade" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <button
                          onClick={() => setExpandedRecipe(null)}
                          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-5 left-6 right-6">
                          <div className="flex items-center gap-2 mb-2">
                            {recipe.sourceSite && (
                              <span className="text-xs text-white/90 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">{recipe.sourceSite}</span>
                            )}
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{toTitleCase(recipe.name)}</h3>
                          <p className="text-white/80 text-sm mt-1 line-clamp-2">{recipe.description}</p>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8">
                        {/* Serving Size Adjuster */}
                        <div className="flex items-center gap-3 mb-4 bg-[#F4F2EA] rounded-2xl p-3">
                          <span className="text-sm font-medium text-[#1A1A1A]">Servings:</span>
                          <div className="flex gap-1.5">
                            {SERVING_MULTIPLIERS.map(mult => (
                              <button
                                key={mult}
                                onClick={(e) => { e.stopPropagation(); setServingMultiplier(mult); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  servingMultiplier === mult
                                    ? 'bg-[#C49A5C] text-white shadow-sm'
                                    : 'bg-white text-[#6E6A60] hover:bg-[#E8E6DC]'
                                }`}
                              >
                                {mult}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stat pills (scaled by servingMultiplier) */}
                        {(() => {
                          const n = servingMultiplier !== 1 ? scaleNutrition(recipe.nutrition, servingMultiplier) : recipe.nutrition;
                          return (
                            <>
                              {servingMultiplier !== 1 && (
                                <p className="text-xs text-[#C49A5C] italic mb-2">Nutrition scaled to {servingMultiplier}x — adjust ingredient amounts proportionally.</p>
                              )}
                              <div className="flex items-center gap-3 mb-6 flex-wrap">
                                <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">
                                  <Clock className="w-3.5 h-3.5" /> Prep: {recipe.prepTime}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">
                                  <Flame className="w-3.5 h-3.5" /> Cook: {recipe.cookTime}
                                </div>
                                {n.calories > 0 && (
                                  <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">
                                    <UtensilsCrossed className="w-3.5 h-3.5" /> {n.calories} cal
                                  </div>
                                )}
                                {n.protein !== '0g' && (
                                  <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">P: {n.protein}</div>
                                )}
                                {n.carbs !== '0g' && (
                                  <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">C: {n.carbs}</div>
                                )}
                                {n.fat !== '0g' && (
                                  <div className="flex items-center gap-1.5 text-sm text-[#6E6A60] bg-[#F4F2EA] px-3 py-1.5 rounded-full">F: {n.fat}</div>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Why it works */}
                        <div className="bg-[#E8E6DC] rounded-2xl p-4 mb-6">
                          <p className="text-sm text-[#1A1A1A]"><strong>Why it works:</strong> {recipe.whyItWorks}</p>
                        </div>

                        {/* Steps */}
                        <div className="mb-6">
                          <h4 className="font-bold text-[#1A1A1A] mb-4 text-lg">Steps</h4>
                          <ol className="space-y-3">
                            {recipe.steps.map((step: string, stepIdx: number) => (
                              <li key={stepIdx} className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-7 h-7 bg-[#C49A5C] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                  {stepIdx + 1}
                                </span>
                                <span className="text-[#1A1A1A] leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#E8E6DC]">
                          <Button onClick={() => setExpandedRecipe(null)} variant="outline" className="rounded-full">
                            Back to results
                          </Button>
                          <Button
                            onClick={() => onToggleFavorite(normalizeScrapedRecipe(recipe, recipeData.source === 'scraped' ? 'scraped' : 'demo'))}
                            variant="outline"
                            className={`rounded-full flex items-center gap-2 ${isFavorite(recipe.name) ? 'text-red-500 border-red-300' : ''}`}
                          >
                            <Heart className={`w-4 h-4 ${isFavorite(recipe.name) ? 'fill-red-400' : ''}`} />
                            {isFavorite(recipe.name) ? 'Saved' : 'Save'}
                          </Button>
                          <Button
                            onClick={() => {
                              onAddToPlanner(normalizeScrapedRecipe(recipe, recipeData.source === 'scraped' ? 'scraped' : 'demo'));
                            }}
                            variant="outline"
                            className="rounded-full flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" /> Add to Planner
                          </Button>
                          <Button
                            onClick={() => onShareRecipe(recipe)}
                            variant="outline"
                            className="rounded-full flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" /> Share
                          </Button>
                          {recipe.sourceUrl && (
                            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#C49A5C] underline hover:text-[#8B6F3C] font-medium">
                              View on {recipe.sourceSite || 'Source'}
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Recipe Cards Grid — side by side */}
            {expandedRecipe === null && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recipeData.recipes.map((recipe: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setExpandedRecipe(idx)}
                    className="bg-white rounded-[24px] overflow-hidden shadow-lg cursor-pointer card-hover group"
                  >
                    {/* Card Image */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover image-grade transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(normalizeScrapedRecipe(recipe, recipeData.source === 'scraped' ? 'scraped' : 'demo'));
                        }}
                        className="absolute top-3 left-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10"
                      >
                        <Heart className={`w-4 h-4 ${isFavorite(recipe.name) ? 'fill-red-400 text-red-400' : ''}`} />
                      </button>
                      {recipe.sourceSite && (
                        <span className="absolute top-3 right-3 text-[10px] text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                          {recipe.sourceSite}
                        </span>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">{toTitleCase(recipe.name)}</h3>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <p className="text-xs text-[#6E6A60] line-clamp-2 mb-3 leading-relaxed">{recipe.description}</p>
                      <div className="flex items-center gap-3 text-xs text-[#6E6A60]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {recipe.prepTime !== 'N/A' ? recipe.prepTime : recipe.cookTime}
                        </div>
                        {recipe.nutrition.calories > 0 && (
                          <div className="flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {recipe.nutrition.calories} cal
                          </div>
                        )}
                        <div className="ml-auto text-[#C49A5C] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          View <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
