import { useState, useCallback } from 'react';
import { Flame, Beef, Wheat, Droplets, RotateCcw, Star, Calendar, ArrowRight } from 'lucide-react';
import type { NutritionGoals } from '@/types';
import { nutritionSpecialists } from '@/data';
import { trackEvent, EVENTS } from '@/utils/analytics';

interface NutritionSectionProps {
  nutritionRef: React.RefObject<HTMLDivElement | null>;
  nutritionGoals: NutritionGoals;
  onUpdateGoals: (goals: NutritionGoals) => void;
}

interface MacroConfig {
  field: keyof NutritionGoals;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  min: number;
  max: number;
  step: number;
}

const MACROS: MacroConfig[] = [
  {
    field: 'calories',
    label: 'Calories',
    unit: 'kcal',
    icon: <Flame className="w-4 h-4" />,
    color: '#D4763C',
    bgColor: '#D4763C20',
    min: 800,
    max: 4000,
    step: 50,
  },
  {
    field: 'protein',
    label: 'Protein',
    unit: 'g',
    icon: <Beef className="w-4 h-4" />,
    color: '#C49A5C',
    bgColor: '#C49A5C20',
    min: 20,
    max: 300,
    step: 5,
  },
  {
    field: 'carbs',
    label: 'Carbs',
    unit: 'g',
    icon: <Wheat className="w-4 h-4" />,
    color: '#B8976A',
    bgColor: '#B8976A20',
    min: 20,
    max: 500,
    step: 5,
  },
  {
    field: 'fat',
    label: 'Fat',
    unit: 'g',
    icon: <Droplets className="w-4 h-4" />,
    color: '#6E6A60',
    bgColor: '#6E6A6020',
    min: 10,
    max: 200,
    step: 5,
  },
];

export default function NutritionSection({ nutritionRef, nutritionGoals, onUpdateGoals }: NutritionSectionProps) {
  const [activeSlider, setActiveSlider] = useState<string | null>(null);

  const handleSliderChange = useCallback((field: keyof NutritionGoals, value: number) => {
    onUpdateGoals({ ...nutritionGoals, [field]: value });
  }, [nutritionGoals, onUpdateGoals]);

  const resetToDefaults = useCallback(() => {
    onUpdateGoals({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  }, [onUpdateGoals]);

  return (
    <section ref={nutritionRef} className="section-pinned z-50">
      <div className="absolute inset-0 bg-warm-white" />

      {/* Left Image Card */}
      <div className="nutrition-image absolute left-[6vw] top-[14vh] w-[48vw] h-[72vh] japandi-card overflow-hidden">
        <img src="/nutrition_salmon_bowl.jpg" alt="Nutritious meal" className="w-full h-full object-cover image-grade" />

        {/* Floating calorie badge on the image */}
        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-lg border border-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#D4763C20' }}>
              <Flame className="w-5 h-5" style={{ color: '#D4763C' }} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#1A1A1A] leading-none">{nutritionGoals.calories}</div>
              <div className="text-xs text-[#6E6A60] font-medium">kcal / day target</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Nutrition Panel */}
      <div className="nutrition-panel absolute left-[58vw] top-[14vh] w-[36vw]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[clamp(1.8rem,3.5vw,3rem)] font-black lowercase text-[#1A1A1A] leading-none mb-3">
              Nutrition That<br />Adapts To You
            </h2>
            <p className="text-[#6E6A60] text-base leading-relaxed max-w-[28vw]">
              Drag the sliders to set your daily goals. We'll suggest recipes that match your targets.
            </p>
          </div>
        </div>

        {/* Interactive Macro Sliders */}
        <div className="space-y-5 mt-6">
          {MACROS.map((macro) => {
            const value = nutritionGoals[macro.field];
            const percentage = ((value - macro.min) / (macro.max - macro.min)) * 100;
            const isActive = activeSlider === macro.field;

            return (
              <div key={macro.field} className="macro-row">
                {/* Label Row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200"
                      style={{
                        backgroundColor: macro.bgColor,
                        color: macro.color,
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {macro.icon}
                    </div>
                    <span className="font-semibold text-[#1A1A1A] text-[15px]">{macro.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-xl font-black transition-all duration-200"
                      style={{ color: macro.color }}
                    >
                      {value}
                    </span>
                    <span className="text-xs text-[#6E6A60] font-medium">{macro.unit}</span>
                  </div>
                </div>

                {/* Slider Track */}
                <div className="relative h-3 group">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-[#E8E6DC] rounded-full" />

                  {/* Filled track */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: macro.color,
                      opacity: isActive ? 1 : 0.85,
                    }}
                  />

                  {/* Thumb indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-[3px] border-white shadow-md transition-transform duration-150 z-10"
                    style={{
                      left: `${percentage}%`,
                      backgroundColor: macro.color,
                      transform: `translateY(-50%) translateX(-50%) scale(${isActive ? 1.25 : 1})`,
                    }}
                  />

                  {/* Invisible range input */}
                  <input
                    type="range"
                    min={macro.min}
                    max={macro.max}
                    step={macro.step}
                    value={value}
                    onChange={(e) => handleSliderChange(macro.field, parseInt(e.target.value))}
                    onMouseDown={() => setActiveSlider(macro.field)}
                    onMouseUp={() => setActiveSlider(null)}
                    onTouchStart={() => setActiveSlider(macro.field)}
                    onTouchEnd={() => setActiveSlider(null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    aria-label={`${macro.label} daily target: ${value} ${macro.unit}`}
                  />
                </div>

                {/* Min/Max labels */}
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#6E6A60]/60">{macro.min}{macro.unit}</span>
                  <span className="text-[10px] text-[#6E6A60]/60">{macro.max}{macro.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          onClick={resetToDefaults}
          className="mt-5 flex items-center gap-2 text-sm text-[#6E6A60] hover:text-[#C49A5C] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </button>

        {/* Specialist Cards */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Talk to a Specialist</h3>
          <p className="text-sm text-[#6E6A60] mb-4">Get personalized guidance from certified nutrition experts.</p>

          <div className="space-y-3">
            {nutritionSpecialists.slice(0, 2).map((specialist) => (
              <div
                key={specialist.id}
                className="group relative bg-white rounded-2xl border border-[#E8E6DC] p-4 hover:shadow-lg hover:border-[#D4763C]/30 transition-all duration-300 cursor-pointer"
                onClick={() => {
                  trackEvent(EVENTS.SPECIALIST_VIEWED, {
                    specialistId: specialist.id,
                    specialistName: specialist.name,
                  });
                }}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={specialist.avatar}
                      alt={specialist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[#1A1A1A] text-sm truncate">{specialist.name}</span>
                      {specialist.featured && (
                        <span className="px-1.5 py-0.5 bg-[#D4763C]/10 text-[#D4763C] text-[10px] font-bold rounded-md uppercase tracking-wide flex-shrink-0">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6E6A60] mb-1.5 truncate">{specialist.title}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {specialist.specialty.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-[#F5F3ED] text-[#6E6A60] text-[10px] font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Rating + Price Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-[#D4763C] text-[#D4763C]" />
                        <span className="text-xs font-semibold text-[#1A1A1A]">{specialist.rating}</span>
                        <span className="text-[10px] text-[#6E6A60]">({specialist.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#6E6A60]">
                        <Calendar className="w-3 h-3" />
                        <span>{specialist.sessionLength}</span>
                        <span className="font-semibold text-[#1A1A1A] ml-1">${specialist.pricePerSession}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Book CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent(EVENTS.SPECIALIST_BOOK_CLICKED, {
                      specialistId: specialist.id,
                      specialistName: specialist.name,
                      price: specialist.pricePerSession,
                    });
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#D4763C]/10 text-[#D4763C] text-sm font-semibold hover:bg-[#D4763C] hover:text-white transition-all duration-200 cursor-pointer"
                >
                  Book Consultation
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
