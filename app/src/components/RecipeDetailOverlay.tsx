import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Heart, Calendar, Share2, Clock, Flame, ChefHat, Lightbulb, Printer, ExternalLink, Check, Star, MessageSquare, Timer, Volume2 } from 'lucide-react';
import { toTitleCase, scaleNutrition, scaleIngredientText, extractTimeFromStep } from '@/utils';
import { SERVING_MULTIPLIERS } from '@/constants';
import type { SavedRecipe, Toast } from '@/types';
import ShareCardModal from './ShareCardModal';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useCookingTimers } from '@/hooks/use-cooking-timers';
import { useVoiceCooking } from '@/hooks/use-voice-cooking';
import OptimizedImage from '@/components/OptimizedImage';
import CookingTimerBar from './CookingTimerBar';
import VoiceCookingBar from './VoiceCookingBar';

interface RecipeDetailOverlayProps {
  recipe: SavedRecipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: SavedRecipe) => void;
  onAddToPlanner: (recipe: SavedRecipe) => void;
  onShareRecipe: (recipe: SavedRecipe) => void;
  showToast?: (message: string, type: Toast['type']) => void;
  onUpdateRecipeMeta?: (name: string, updates: { rating?: number; personalNotes?: string }) => void;
  onClose: () => void;
}

export default function RecipeDetailOverlay({
  recipe,
  isFavorite,
  onToggleFavorite,
  onAddToPlanner,
  onShareRecipe,
  showToast,
  onUpdateRecipeMeta,
  onClose,
}: RecipeDetailOverlayProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [localRating, setLocalRating] = useState<number>(recipe.rating || 0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [localNotes, setLocalNotes] = useState<string>(recipe.personalNotes || '');
  const [servingMultiplier, setServingMultiplier] = useState<number>(1);
  const [timerSetupStep, setTimerSetupStep] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { timers, startTimer, pauseTimer, resumeTimer, resetTimer, removeTimer } = useCookingTimers();
  const voice = useVoiceCooking();
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Auto-scroll to current voice step
  useEffect(() => {
    if (voice.isActive && stepRefs.current[voice.currentStep]) {
      stepRefs.current[voice.currentStep]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [voice.isActive, voice.currentStep]);

  // Auto-check steps as voice advances past them
  useEffect(() => {
    if (voice.isActive && voice.currentStep > 0) {
      setCheckedSteps(prev => {
        const next = new Set(prev);
        for (let i = 0; i < voice.currentStep; i++) next.add(i);
        return next;
      });
    }
  }, [voice.isActive, voice.currentStep]);

  // Debounced notes saving
  const saveNotes = useCallback((text: string) => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onUpdateRecipeMeta?.(recipe.name, { personalNotes: text || undefined });
    }, 600);
  }, [onUpdateRecipeMeta, recipe.name]);

  const handleNotesChange = (text: string) => {
    if (text.length > 500) return;
    setLocalNotes(text);
    saveNotes(text);
  };

  const handleRatingClick = (star: number) => {
    const newRating = star === localRating ? 0 : star;
    setLocalRating(newRating);
    onUpdateRecipeMeta?.(recipe.name, { rating: newRating || undefined });
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current); };
  }, []);

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Lock body scroll while overlay is open (Escape is handled by useFocusTrap)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Scaled nutrition for serving size
  const scaledNutrition = servingMultiplier !== 1
    ? scaleNutrition(recipe.nutrition, servingMultiplier)
    : recipe.nutrition;

  // Parse numeric value from nutrition string like "25g" -> 25
  const parseNutrition = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseInt(val) || 0;
  };

  // Calculate macro percentages for visual bar
  const protein = parseNutrition(scaledNutrition.protein);
  const carbs = parseNutrition(scaledNutrition.carbs);
  const fat = parseNutrition(scaledNutrition.fat);
  const totalMacroGrams = protein + carbs + fat;
  const proteinPct = totalMacroGrams > 0 ? Math.round((protein / totalMacroGrams) * 100) : 0;
  const carbsPct = totalMacroGrams > 0 ? Math.round((carbs / totalMacroGrams) * 100) : 0;
  const fatPct = totalMacroGrams > 0 ? 100 - proteinPct - carbsPct : 0;

  const trapRef = useFocusTrap(onClose);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Content Card */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Recipe: ${toTitleCase(recipe.name)}`}
        className="relative w-full max-w-[900px] max-h-[90vh] bg-[#F4F2EA] rounded-[28px] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh] recipe-slider">
          {/* Hero Image */}
          <div className="relative h-[36vh] min-h-[260px]">
            <OptimizedImage src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
              aria-label="Close recipe details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="absolute top-4 right-16 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
              title="Print recipe"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Tags on image */}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {recipe.tags.map(tag => (
                <span key={tag} className="text-xs bg-[#C49A5C]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>

            {/* Title over image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl font-black text-white leading-tight drop-shadow-lg">
                {toTitleCase(recipe.name)}
              </h1>
              {recipe.description && (
                <p className="text-white/80 text-sm mt-2 max-w-2xl leading-relaxed">
                  {recipe.description}
                </p>
              )}
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E8E6DC]">
            {recipe.totalTime && recipe.totalTime !== 'N/A' && (
              <div className="flex items-center gap-1.5 text-[#6E6A60]">
                <Clock className="w-4 h-4 text-[#C49A5C]" />
                <span className="text-sm font-medium">{recipe.totalTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[#6E6A60]">
              <Flame className="w-4 h-4 text-[#C49A5C]" />
              <span className="text-sm font-medium">{recipe.nutrition.calories} cal</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6E6A60]">
              <ChefHat className="w-4 h-4 text-[#C49A5C]" />
              <span className="text-sm font-medium">{recipe.difficulty}</span>
            </div>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-xs text-[#C49A5C] hover:text-[#8B6F3C] font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {recipe.sourceSite || 'Source'}
              </a>
            )}
          </div>

          {/* Serving Size Selector */}
          <div className="flex items-center gap-3 mx-6 mt-4 bg-white rounded-2xl p-3 shadow-sm">
            <span className="text-sm font-medium text-[#1A1A1A]">Servings:</span>
            <div className="flex gap-1.5">
              {SERVING_MULTIPLIERS.map(mult => (
                <button
                  key={mult}
                  onClick={() => setServingMultiplier(mult)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    servingMultiplier === mult
                      ? 'bg-[#C49A5C] text-white shadow-sm'
                      : 'bg-[#F4F2EA] text-[#6E6A60] hover:bg-[#E8E6DC]'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
            {servingMultiplier !== 1 && (
              <span className="text-xs text-[#C49A5C] italic ml-auto">Scaled to {servingMultiplier}x</span>
            )}
          </div>

          {/* Enhanced Nutrition Section */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Calories</p>
                <p className="text-xl font-black text-[#C49A5C]">{scaledNutrition.calories}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Protein</p>
                <p className="text-xl font-black text-[#1A1A1A]">{scaledNutrition.protein}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Carbs</p>
                <p className="text-xl font-black text-[#1A1A1A]">{scaledNutrition.carbs}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-1">Fat</p>
                <p className="text-xl font-black text-[#1A1A1A]">{scaledNutrition.fat}</p>
              </div>
            </div>

            {/* Macro Ratio Bar */}
            {totalMacroGrams > 0 && (
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-[#6E6A60] mb-2">Macro Split</p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-[#C49A5C] rounded-l-full transition-all duration-500" style={{ width: `${proteinPct}%` }} />
                  <div className="bg-[#A8B590] transition-all duration-500" style={{ width: `${carbsPct}%` }} />
                  <div className="bg-[#E8E6DC] rounded-r-full transition-all duration-500" style={{ width: `${fatPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-[#6E6A60]">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#C49A5C] mr-1" />Protein {proteinPct}%</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#A8B590] mr-1" />Carbs {carbsPct}%</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#E8E6DC] mr-1 border border-[#d5d1c7]" />Fat {fatPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Two-Column: Ingredients + Steps on desktop */}
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
            {/* Ingredients */}
            {recipe.ingredients.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">Ingredients</h2>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <ul className="space-y-2.5">
                    {recipe.ingredients.map((ingredient, i) => (
                      <li key={i} className="flex items-start gap-3 text-[#3A3A3A]">
                        <span className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full border-2 border-[#C49A5C]/30" />
                        <span className="text-sm leading-relaxed">{scaleIngredientText(ingredient, servingMultiplier)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Steps with step-tracking */}
            {recipe.steps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Instructions</h2>
                  <div className="flex items-center gap-2">
                    {voice.isSupported && recipe.steps.length > 0 && !voice.isActive && (
                      <button
                        onClick={() => voice.startVoiceMode(recipe.steps)}
                        className="flex items-center gap-1 text-xs font-medium text-[#C49A5C] hover:text-[#8B6F3C] transition-colors px-2 py-1 rounded-full bg-[#C49A5C]/10 hover:bg-[#C49A5C]/20"
                        aria-label="Start voice-guided cooking"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Cook Along
                      </button>
                    )}
                    <span className="text-xs text-[#6E6A60]">
                      {checkedSteps.size}/{recipe.steps.length} done
                    </span>
                  </div>
                </div>
                <ol className="space-y-3">
                  {recipe.steps.map((step, i) => (
                    <li
                      key={i}
                      ref={el => { stepRefs.current[i] = el; }}
                      className={`flex gap-3 p-3 rounded-2xl border-2 transition-all duration-200 ${
                        voice.isActive && voice.currentStep === i
                          ? 'voice-step-active border-[#C49A5C] bg-[#C49A5C]/5'
                          : checkedSteps.has(i)
                            ? 'bg-[#C49A5C]/8 opacity-60 border-transparent'
                            : 'bg-white shadow-sm hover:shadow-md border-transparent'
                      }`}
                    >
                      <span
                        onClick={() => toggleStep(i)}
                        className={`w-7 h-7 flex-shrink-0 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                          checkedSteps.has(i)
                            ? 'bg-[#C49A5C] text-white'
                            : 'bg-[#F4F2EA] text-[#C49A5C]'
                        }`}
                      >
                        {checkedSteps.has(i) ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          onClick={() => toggleStep(i)}
                          className={`text-sm leading-relaxed cursor-pointer ${
                            checkedSteps.has(i) ? 'line-through text-[#6E6A60]' : 'text-[#3A3A3A]'
                          }`}
                        >{step}</p>
                        {/* Inline timer setup */}
                        {timerSetupStep === i && (
                          <div className="mt-2 flex items-center gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              value={customMinutes}
                              onChange={e => setCustomMinutes(e.target.value)}
                              placeholder={String(Math.ceil((extractTimeFromStep(step) || 300) / 60))}
                              className="w-16 px-2 py-1 text-xs rounded-full border border-[#E8E6DC] text-center focus:border-[#C49A5C] focus:outline-none"
                              min="1"
                              max="999"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const mins = parseInt(customMinutes) || Math.ceil((extractTimeFromStep(step) || 300) / 60);
                                  startTimer(i, `Step ${i + 1}`, mins * 60);
                                  setTimerSetupStep(null);
                                  setCustomMinutes('');
                                }
                              }}
                            />
                            <span className="text-xs text-[#6E6A60]">min</span>
                            <button
                              onClick={() => {
                                const mins = parseInt(customMinutes) || Math.ceil((extractTimeFromStep(step) || 300) / 60);
                                startTimer(i, `Step ${i + 1}`, mins * 60);
                                setTimerSetupStep(null);
                                setCustomMinutes('');
                              }}
                              className="px-3 py-1 bg-[#C49A5C] text-white text-xs rounded-full font-medium hover:bg-[#8B6F3C] transition-colors btn-press"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => setTimerSetupStep(null)}
                              className="text-[#6E6A60] hover:text-[#1A1A1A] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Timer icon */}
                      {!checkedSteps.has(i) && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const defaultSeconds = extractTimeFromStep(step);
                            setTimerSetupStep(timerSetupStep === i ? null : i);
                            setCustomMinutes(defaultSeconds ? String(Math.ceil(defaultSeconds / 60)) : '');
                          }}
                          className="w-7 h-7 flex-shrink-0 rounded-full bg-[#F4F2EA] text-[#C49A5C] flex items-center justify-center hover:bg-[#C49A5C] hover:text-white transition-all"
                          title="Set timer for this step"
                          aria-label={`Set cooking timer for step ${i + 1}`}
                        >
                          <Timer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Why It Works */}
          {recipe.whyItWorks && (
            <div className="mx-6 my-4 p-4 bg-[#C49A5C]/10 rounded-2xl border border-[#C49A5C]/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-[#C49A5C]" />
                <h3 className="text-sm font-bold text-[#C49A5C]">Why It Works</h3>
              </div>
              <p className="text-sm text-[#5A5548] leading-relaxed">{recipe.whyItWorks}</p>
            </div>
          )}

          {/* Your Rating & Notes — only visible for favorited recipes */}
          {isFavorite && onUpdateRecipeMeta && (
            <div className="mx-6 my-4 p-5 bg-[#F4F2EA] rounded-2xl border border-[#E8E6DC]">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-[#C49A5C]" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">Your Notes</h3>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-4">
                <span className="text-xs text-[#6E6A60] mr-2 font-medium">Rating</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform duration-150 hover:scale-110 cursor-pointer"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-5 h-5 transition-colors duration-150 ${
                        star <= (hoveredStar || localRating)
                          ? 'fill-[#C49A5C] text-[#C49A5C]'
                          : 'text-[#D5D1C7]'
                      }`}
                    />
                  </button>
                ))}
                {localRating > 0 && (
                  <span className="text-xs text-[#6E6A60] ml-2">{localRating}/5</span>
                )}
              </div>

              {/* Notes Textarea */}
              <textarea
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add your notes... (e.g., &quot;added extra garlic&quot;, &quot;kids loved it&quot;)"
                className="w-full bg-white rounded-2xl p-4 text-sm text-[#3A3A3A] placeholder:text-[#B5B1A8] border border-[#E8E6DC] focus:border-[#C49A5C]/40 focus:outline-none resize-none leading-relaxed transition-colors"
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-end mt-1.5">
                <span className={`text-[10px] font-medium ${localNotes.length > 450 ? 'text-[#D4763C]' : 'text-[#B5B1A8]'}`}>
                  {localNotes.length}/500
                </span>
              </div>
            </div>
          )}

          {/* Voice Cooking Bar */}
          {voice.isActive && (
            <div className="sticky bottom-[68px] z-10 mx-4 mb-2">
              <VoiceCookingBar
                currentStep={voice.currentStep}
                totalSteps={voice.totalSteps}
                isSpeaking={voice.isSpeaking}
                isPaused={voice.isPaused}
                rate={voice.rate}
                onNext={voice.nextStep}
                onPrev={voice.prevStep}
                onRepeat={voice.repeatStep}
                onPause={voice.pauseSpeech}
                onResume={voice.resumeSpeech}
                onStop={voice.stopVoiceMode}
                onSetRate={voice.setRate}
                availableVoices={voice.availableVoices}
                selectedVoice={voice.selectedVoice}
                onSelectVoice={voice.setSelectedVoice}
                isListening={voice.isListening}
                isListeningSupported={voice.isListeningSupported}
                onToggleListening={voice.toggleListening}
                lastHeard={voice.lastHeard}
              />
            </div>
          )}

          {/* Active Cooking Timers */}
          {timers.length > 0 && (
            <div className={`sticky ${voice.isActive ? 'bottom-[188px]' : 'bottom-[68px]'} z-10 mx-4 mb-2`}>
              <CookingTimerBar
                timers={timers}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onReset={resetTimer}
                onRemove={removeTimer}
              />
            </div>
          )}

          {/* Bottom padding for action bar + optional timer/voice bars */}
          <div className={(voice.isActive && timers.length > 0) ? 'h-52' : (voice.isActive || timers.length > 0) ? 'h-32' : 'h-20'} />
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#F4F2EA]/95 backdrop-blur-md border-t border-[#E8E6DC] px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => onToggleFavorite(recipe)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors btn-press ${
              isFavorite
                ? 'bg-red-50 text-red-500 border border-red-200'
                : 'bg-white text-[#6E6A60] border border-[#E8E6DC] hover:border-[#C49A5C]/40'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-400' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={() => onAddToPlanner(recipe)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors btn-press"
          >
            <Calendar className="w-4 h-4" />
            Add to Planner
          </button>

          <button
            onClick={() => showToast ? setShareOpen(true) : onShareRecipe(recipe)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#6E6A60] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors btn-press"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#6E6A60] border border-[#E8E6DC] rounded-full text-sm font-semibold hover:border-[#C49A5C]/40 transition-colors btn-press hidden sm:flex"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 text-[#6E6A60] text-sm font-medium hover:text-[#1A1A1A] transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Share Card Modal */}
      {shareOpen && showToast && (
        <ShareCardModal
          recipe={recipe}
          onClose={() => setShareOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
