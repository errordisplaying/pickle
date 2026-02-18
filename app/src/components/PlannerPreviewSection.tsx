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

      {/* Left Text Block */}
      <div className="planner-text absolute left-[6vw] top-[24vh] w-[28vw]">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black uppercase text-[#1A1A1A] leading-none mb-6">
          Plan A Week In Minutes
        </h2>
        <p className="text-[#6E6A60] text-lg leading-relaxed mb-4">
          Tap a day, pick meals for breakfast, lunch, and dinner. We'll show you a grocery list and prep schedule automatically.
        </p>

        {/* Quick stats */}
        <div className="flex gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex-1 text-center">
            <p className="text-2xl font-bold text-[#8B7355]">
              {Object.values(plannerMeals).reduce((acc, day) =>
                acc + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0), 0
              )}
            </p>
            <p className="text-xs text-[#6E6A60]">Meals Planned</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex-1 text-center">
            <p className="text-2xl font-bold text-[#8B7355]">
              {Object.values(plannerMeals).filter(day => day.breakfast && day.lunch && day.dinner).length}
            </p>
            <p className="text-xs text-[#6E6A60]">Full Days</p>
          </div>
        </div>

        <Button onClick={() => onOpenPlanner()} className="japandi-button bg-[#8B7355] text-white hover:bg-[#6B5740]">
          <Calendar className="w-4 h-4 mr-2" /> Open Planner
        </Button>
      </div>

      {/* Planner Preview Card */}
      <div className="planner-card absolute left-[38vw] top-[16vh] w-[56vw] h-[70vh] japandi-card bg-white p-5">
        {/* Mini week view */}
        <div className="grid grid-cols-7 gap-2 h-full">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="day-tile flex flex-col rounded-2xl bg-[#F4F2EA] p-3 cursor-pointer hover:bg-[#E8E6DC] transition-colors"
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
                          ? 'bg-[#8B7355] text-white'
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
    </section>
  );
}
