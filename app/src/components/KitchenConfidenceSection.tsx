import { ChefHat, Flame, Clock, Droplets } from 'lucide-react';
import { kitchenConfidenceTips } from '@/data';

const tipIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'chef-hat': ChefHat,
  'flame': Flame,
  'clock': Clock,
  'droplets': Droplets,
};

export default function KitchenConfidenceSection() {
  return (
    <section className="section-flowing bg-warm-gray py-20 px-[6vw]">
      {/* Organic divider */}
      <div className="flex justify-center mb-8">
        <svg width="120" height="24" viewBox="0 0 120 24" fill="none" className="text-[#C49A5C] opacity-20">
          <path d="M10 12 Q30 4, 60 12 Q90 20, 110 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="60" cy="12" rx="4" ry="6" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="section-heading text-[clamp(2rem,4vw,3.5rem)] mb-4">
          sharpen your skills
        </h2>
        <p className="text-[#6E6A60] text-lg font-handwritten text-xl">
          Quick tips to boost your confidence in the kitchen.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {kitchenConfidenceTips.map((tip, idx) => {
          const Icon = tipIconMap[tip.icon] || Flame;
          return (
            <div
              key={idx}
              className="bg-white rounded-[28px] p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-black/5 hover:-translate-y-0.5 card-hover animate-card-stagger"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="w-12 h-12 bg-[#C49A5C]/10 rounded-2xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#C49A5C]" />
              </div>
              <h3 className="font-bold text-[#1A1A1A] text-base mb-2">{tip.title}</h3>
              <p className="text-sm text-[#6E6A60] leading-relaxed">{tip.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
