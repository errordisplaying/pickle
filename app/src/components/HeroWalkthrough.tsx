import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Flame } from 'lucide-react';

const DEMO_INGREDIENTS = 'chicken, rice, garlic';
const DEMO_FILTER = 'Gluten-Free';
const DEMO_RECIPES = [
  { name: 'Garlic Chicken Bowl', time: '25 min', cal: 380 },
  { name: 'One-Pot Rice Pilaf', time: '30 min', cal: 320 },
];

const STEP_LABELS = [
  '',
  'type your ingredients',
  'set preferences',
  'search',
  'discover recipes',
  '',
];

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function HeroWalkthrough() {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [activeFilter, setActiveFilter] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [fading, setFading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setStep(4);
      setTypedText(DEMO_INGREDIENTS);
      setActiveFilter(true);
      setShowCards(true);
      return;
    }

    cancelledRef.current = false;

    const typeText = (text: string, charDelay: number): Promise<void> => {
      return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
          if (cancelledRef.current) { clearInterval(interval); return; }
          i++;
          setTypedText(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(interval);
            resolve();
          }
        }, charDelay);
      });
    };

    const runCycle = async () => {
      if (cancelledRef.current) return;

      // Step 0: Idle with cursor
      setStep(0);
      setTypedText('');
      setShowCards(false);
      setActiveFilter(false);
      setButtonPressed(false);
      setFading(false);
      await delay(1500);
      if (cancelledRef.current) return;

      // Step 1: Typewriter
      setStep(1);
      await typeText(DEMO_INGREDIENTS, 60);
      await delay(400);
      if (cancelledRef.current) return;

      // Step 2: Activate filter
      setStep(2);
      setActiveFilter(true);
      await delay(1200);
      if (cancelledRef.current) return;

      // Step 3: Button press
      setStep(3);
      setButtonPressed(true);
      await delay(150);
      if (cancelledRef.current) return;
      setButtonPressed(false);
      await delay(850);
      if (cancelledRef.current) return;

      // Step 4: Show results
      setStep(4);
      setShowCards(true);
      await delay(3000);
      if (cancelledRef.current) return;

      // Step 5: Fade out
      setStep(5);
      setFading(true);
      await delay(600);
      if (cancelledRef.current) return;

      // Loop
      runCycle();
    };

    runCycle();

    return () => { cancelledRef.current = true; };
  }, []);

  const activeStep = step >= 1 && step <= 4 ? step : 0;

  return (
    <div className={`${fading ? 'animate-walkthrough-fade-out' : ''}`} aria-hidden="true">
      {/* Glassmorphism mockup card */}
      <div className="w-[280px] lg:w-[380px] bg-white/10 backdrop-blur-md border border-white/20 rounded-[20px] p-3 lg:p-4">
        {/* Header */}
        <p className="font-handwritten text-white text-base lg:text-lg mb-3 leading-none">
          see how it works
        </p>

        {/* Mini textarea */}
        <div className="bg-white/15 border border-white/10 rounded-xl px-3 py-2 mb-2.5 min-h-[36px] flex items-center">
          {typedText ? (
            <span className="text-white text-xs lg:text-sm font-medium">
              {typedText}
              {step <= 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/80 ml-0.5 align-middle animate-cursor-blink" />
              )}
            </span>
          ) : (
            <span className="text-white/40 text-xs lg:text-sm flex items-center">
              what's in your kitchen?
              {step === 0 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/80 ml-0.5 align-middle animate-cursor-blink" />
              )}
            </span>
          )}
        </div>

        {/* Filter badge */}
        <div className="flex gap-1.5 mb-2.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold transition-all duration-300 ${
              activeFilter
                ? 'bg-[#C49A5C] text-white'
                : 'bg-white/10 text-white/50'
            }`}
          >
            {DEMO_FILTER}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold bg-white/10 text-white/30">
            Vegan
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold bg-white/10 text-white/30 hidden lg:inline">
            Dairy-Free
          </span>
        </div>

        {/* Mini button */}
        <button
          className={`w-full bg-[#C49A5C] text-white rounded-full text-xs lg:text-sm font-semibold py-2 px-4 flex items-center justify-center gap-1.5 transition-transform duration-150 ${
            buttonPressed ? 'scale-[0.96]' : ''
          }`}
          tabIndex={-1}
        >
          <Search className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
          Find Recipes
        </button>

        {/* Result cards */}
        {showCards && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-3">
            {DEMO_RECIPES.map((recipe, i) => (
              <div
                key={recipe.name}
                className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 animate-walkthrough-card-enter"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {/* Color placeholder for "image" */}
                <div className="w-full h-10 lg:h-12 rounded-xl bg-gradient-to-br from-[#C49A5C]/40 to-[#8B6F3C]/30 mb-2" />
                <p className="text-white text-[10px] lg:text-xs font-bold leading-tight truncate">{recipe.name}</p>
                <div className="flex items-center gap-2 mt-1 text-white/50 text-[8px] lg:text-[10px]">
                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{recipe.time}</span>
                  <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />{recipe.cal}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step indicator + label */}
      <div className="flex items-center gap-3 mt-3">
        {/* Dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                s === activeStep ? 'bg-[#C49A5C] scale-110' :
                s < activeStep ? 'bg-white/50' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Step label */}
        {STEP_LABELS[step] && (
          <p
            key={step}
            className="font-handwritten text-white/80 text-sm lg:text-base animate-step-label-in"
          >
            {STEP_LABELS[step]}
          </p>
        )}
      </div>
    </div>
  );
}
