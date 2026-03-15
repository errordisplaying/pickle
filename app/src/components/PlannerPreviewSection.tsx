import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlannerWeek } from '@/types';

interface PlannerPreviewSectionProps {
  plannerRef: React.RefObject<HTMLDivElement | null>;
  plannerMeals: PlannerWeek;
  onOpenPlanner: (day?: string) => void;
}

export default function PlannerPreviewSection({ plannerRef, plannerMeals, onOpenPlanner }: PlannerPreviewSectionProps) {
  return (
    <section ref={plannerRef} className="section-pinned z-40">
      <div className="absolute inset-0 bg-warm-white" />

      <div className="relative flex flex-col gap-6 px-4 pt-20 pb-8 lg:contents">

      {/* Left Text Block */}
      <div className="planner-text relative w-full lg:absolute lg:left-[6vw] lg:top-[24vh] lg:w-[28vw]">
        <h2 className="section-heading text-[clamp(2rem,4vw,3.5rem)] mb-6">
          Plan A Week In Minutes
        </h2>
        <p className="text-[#6E6A60] text-lg leading-relaxed mb-4">
          Tap a day, pick meals for breakfast, lunch, and dinner. We'll show you a grocery list and prep schedule automatically.
        </p>

        {/* Quick stats */}
        <div className="flex gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex-1 text-center">
            <p className="text-2xl font-bold text-[#C49A5C]">
              {Object.values(plannerMeals).reduce((acc, day) =>
                acc + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0), 0
              )}
            </p>
            <p className="text-xs text-[#6E6A60]">Meals Planned</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex-1 text-center">
            <p className="text-2xl font-bold text-[#C49A5C]">
              {Object.values(plannerMeals).filter(day => day.breakfast && day.lunch && day.dinner).length}
            </p>
            <p className="text-xs text-[#6E6A60]">Full Days</p>
          </div>
        </div>

        <Button onClick={() => onOpenPlanner()} className="japandi-button bg-[#C49A5C] text-white hover:bg-[#8B6F3C]">
          <Calendar className="w-4 h-4 mr-2" /> Open Planner
        </Button>
      </div>

      {/* Planner Preview Card */}
      <div className="planner-card relative w-full h-auto lg:absolute lg:left-[38vw] lg:top-[16vh] lg:w-[56vw] lg:h-[70vh] japandi-card bg-white p-4 lg:p-5">
        {/* Mini week view — horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-7 lg:gap-2 lg:h-full lg:overflow-visible">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="day-tile flex-shrink-0 w-[140px] lg:w-auto flex flex-col rounded-2xl bg-[#F4F2EA] p-3 cursor-pointer hover:bg-[#E8E6DC] transition-colors"
              onClick={() => onOpenPlanner(day)}
            >
              <p className="text-xs font-bold text-[#1A1A1A] mb-2 text-center">{day}</p>
              <div className="flex-1 space-y-1.5">
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
                  const value = plannerMeals[day]?.[meal];
                  return (
                    <div
                      key={meal}
                      className={`rounded-xl px-2 py-1.5 text-[10px] leading-tight ${
                        value
                          ? 'bg-[#C49A5C] text-white'
                          : 'bg-white/60 text-[#6E6A60] border border-dashed border-black/10'
                      }`}
                    >
                      <p className="font-medium capitalize">{meal.charAt(0).toUpperCase()}</p>
                      {value && <p className="truncate mt-0.5 opacity-90">{typeof value === 'string' ? value : value.name}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>{/* end mobile flex / lg:contents wrapper */}
    </section>
  );
}
