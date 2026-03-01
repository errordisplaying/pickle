import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Search, Calendar, Heart } from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

interface TourStep {
  selector: string | null;  // null = centered card (no spotlight)
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: null,
    title: 'Welcome to Chickpea!',
    description: 'Discover recipes from ingredients you already have. Let us show you around.',
    icon: <Sparkles className="w-6 h-6 text-[#C49A5C]" />,
  },
  {
    selector: '[data-tour="search"]',
    title: 'Find Recipes',
    description: 'Type the ingredients you have on hand and we\'ll find matching recipes from across the web.',
    icon: <Search className="w-6 h-6 text-[#C49A5C]" />,
  },
  {
    selector: '[data-tour="smart-search"]',
    title: 'Smart Search',
    description: 'Toggle this on to use AI-powered natural language search. Try typing "quick healthy dinner".',
    icon: <Sparkles className="w-6 h-6 text-[#C49A5C]" />,
  },
  {
    selector: '[data-tour="planner"]',
    title: 'Meal Planner',
    description: 'Plan your meals for the entire week. Drag and drop recipes into breakfast, lunch, and dinner slots.',
    icon: <Calendar className="w-6 h-6 text-[#C49A5C]" />,
  },
  {
    selector: '[data-tour="favorites"]',
    title: 'Save Favorites',
    description: 'Tap the heart on any recipe to save it. Rate it, add personal notes, and access it anytime.',
    icon: <Heart className="w-6 h-6 text-[#C49A5C]" />,
  },
];

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const currentStep = TOUR_STEPS[step];
  const isFirstStep = step === 0;
  const isLastStep = step === TOUR_STEPS.length - 1;

  // Measure spotlight target element
  const measureTarget = useCallback(() => {
    if (!currentStep.selector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep.selector]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget);
    };
  }, [measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onComplete(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) onComplete();
        else goNext();
      }
      if (e.key === 'ArrowLeft' && !isFirstStep) goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, isLastStep, isFirstStep, onComplete]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const goNext = () => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(prev => Math.min(prev + 1, TOUR_STEPS.length - 1));
      setTransitioning(false);
    }, 200);
  };

  const goPrev = () => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(prev => Math.max(prev - 1, 0));
      setTransitioning(false);
    }, 200);
  };

  // Calculate tooltip position relative to spotlight
  const getTooltipPosition = (): React.CSSProperties => {
    if (!spotlightRect) {
      // Centered card
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 340;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Prefer positioning below the element
    const belowY = spotlightRect.bottom + padding;
    const aboveY = spotlightRect.top - padding;

    // Center tooltip horizontally relative to target
    let leftX = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2;

    // Clamp to viewport
    if (leftX < padding) leftX = padding;
    if (leftX + tooltipWidth > viewportWidth - padding) leftX = viewportWidth - padding - tooltipWidth;

    // If element is in the lower half, position above
    if (spotlightRect.top > viewportHeight * 0.5) {
      return { bottom: `${viewportHeight - aboveY}px`, left: `${leftX}px` };
    }

    return { top: `${belowY}px`, left: `${leftX}px` };
  };

  // Build clip-path for spotlight hole
  const getBackdropStyle = (): React.CSSProperties => {
    if (!spotlightRect) return {};

    const pad = 12;
    const r = 16;
    const x = spotlightRect.left - pad;
    const y = spotlightRect.top - pad;
    const w = spotlightRect.width + pad * 2;
    const h = spotlightRect.height + pad * 2;

    return {
      clipPath: `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${x}px ${y + r}px,
        ${x + r}px ${y}px,
        ${x + w - r}px ${y}px,
        ${x + w}px ${y + r}px,
        ${x + w}px ${y + h - r}px,
        ${x + w - r}px ${y + h}px,
        ${x + r}px ${y + h}px,
        ${x}px ${y + h - r}px,
        ${x}px ${y + r}px
      )`,
    };
  };

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Dark backdrop with spotlight hole */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={getBackdropStyle()}
        onClick={onComplete}
      />

      {/* Spotlight ring glow (only when targeting an element) */}
      {spotlightRect && (
        <div
          className="absolute rounded-2xl border-2 border-[#C49A5C]/50 pointer-events-none animate-pulse-soft"
          style={{
            top: spotlightRect.top - 12,
            left: spotlightRect.left - 12,
            width: spotlightRect.width + 24,
            height: spotlightRect.height + 24,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={`absolute w-[340px] transition-all duration-200 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={getTooltipPosition()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-[24px] shadow-2xl border border-[#E8E6DC] overflow-hidden">
          {/* Content */}
          <div className="p-6">
            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C49A5C]/10 flex items-center justify-center flex-shrink-0">
                {currentStep.icon}
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">{currentStep.title}</h3>
            </div>

            <p className="text-sm text-[#6E6A60] leading-relaxed mb-5">
              {currentStep.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? 'w-5 bg-[#C49A5C]' : i < step ? 'w-1.5 bg-[#C49A5C]/40' : 'w-1.5 bg-[#E8E6DC]'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={goPrev}
                    className="w-8 h-8 rounded-full bg-[#F4F2EA] flex items-center justify-center text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors cursor-pointer"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {isLastStep ? (
                  <button
                    onClick={onComplete}
                    className="px-4 py-2 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors btn-press cursor-pointer"
                  >
                    Start Cooking
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 px-4 py-2 bg-[#C49A5C] text-white rounded-full text-sm font-semibold hover:bg-[#8B6F3C] transition-colors btn-press cursor-pointer"
                  >
                    {isFirstStep ? "Let's Go" : 'Next'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <div className="px-6 pb-4 -mt-1">
              <button
                onClick={onComplete}
                className="text-xs text-[#B5B1A8] hover:text-[#6E6A60] transition-colors cursor-pointer"
              >
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
