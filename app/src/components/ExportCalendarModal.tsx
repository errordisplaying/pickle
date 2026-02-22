import { X, ExternalLink, Calendar } from 'lucide-react';
import type { PlannerWeek, SavedRecipe } from '@/types';
import { generateGoogleCalendarUrl, toTitleCase } from '@/utils';

interface ExportCalendarModalProps {
  plannerMeals: PlannerWeek;
  onClose: () => void;
}

const ExportCalendarModal = ({ plannerMeals, onClose }: ExportCalendarModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[24px] max-w-lg w-full max-h-[70vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C49A5C]/10 rounded-2xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#C49A5C]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1A1A1A]">Export to Google Calendar</h3>
              <p className="text-xs text-[#6E6A60]">Click each meal to add it to your calendar</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4F2EA] flex items-center justify-center hover:bg-[#E8E6DC] transition-colors">
            <X className="w-4 h-4 text-[#6E6A60]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
            const slots = (['breakfast', 'lunch', 'dinner'] as const).filter(s => plannerMeals[day]?.[s]);
            if (slots.length === 0) return null;
            return (
              <div key={day}>
                <p className="text-xs font-bold text-[#C49A5C] uppercase tracking-wider mb-2">{day}</p>
                <div className="space-y-1.5">
                  {slots.map(slot => {
                    const recipe = plannerMeals[day][slot] as SavedRecipe;
                    return (
                      <a
                        key={slot}
                        href={generateGoogleCalendarUrl(recipe, slot, day)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#F4F2EA] transition-colors border border-transparent hover:border-black/5 group"
                      >
                        {recipe.image && (
                          <img src={recipe.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{toTitleCase(recipe.name)}</p>
                          <p className="text-[10px] text-[#6E6A60] capitalize">{slot} · {recipe.nutrition.calories > 0 ? `${recipe.nutrition.calories} cal` : ''}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#C49A5C] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].every(day =>
            !(['breakfast', 'lunch', 'dinner'] as const).some(s => plannerMeals[day]?.[s])
          ) && (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-[#E8E6DC] mx-auto mb-3" />
              <p className="text-sm text-[#6E6A60]">No meals planned yet</p>
              <p className="text-xs text-[#6E6A60]/70 mt-1">Add recipes to your meal planner first</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportCalendarModal;
