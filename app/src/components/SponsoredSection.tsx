import { Megaphone, ArrowRight } from 'lucide-react';

interface SponsoredSectionProps {
  title?: string;
  className?: string;
}

export default function SponsoredSection({ title = 'Ad Space', className = '' }: SponsoredSectionProps) {
  return (
    <section className={`section-flowing bg-warm-white py-12 px-[6vw] ${className}`}>
      <div className="max-w-6xl mx-auto">
        <p className="text-xs text-[#6E6A60] uppercase tracking-wider mb-8 text-center">{title}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Featured Spot',
              desc: 'Showcase your kitchen brand, meal kit, or food product to thousands of home cooks actively searching for recipes.',
              highlight: true,
            },
            {
              label: 'Product Spotlight',
              desc: 'Reach engaged food enthusiasts who care about quality ingredients, cookware, and smart kitchen tools.',
              highlight: false,
            },
            {
              label: 'Brand Placement',
              desc: 'Get your brand in front of a growing, food-passionate community. Perfect for cookbooks, courses, and food subscriptions.',
              highlight: false,
            },
          ].map((slot, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer card-hover border-2 border-dashed border-[#C49A5C]/20 hover:border-[#C49A5C]/40"
            >
              {/* Placeholder visual */}
              <div className={`relative h-52 flex flex-col items-center justify-center ${
                slot.highlight ? 'bg-gradient-to-br from-[#C49A5C]/10 to-[#8B6F3C]/10' : 'bg-[#F4F2EA]'
              }`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
                  slot.highlight ? 'bg-[#C49A5C]/20' : 'bg-[#E8E6DC]'
                }`}>
                  <Megaphone className={`w-7 h-7 ${slot.highlight ? 'text-[#C49A5C]' : 'text-[#C49A5C]/50'}`} />
                </div>
                <span className="text-xs font-semibold text-[#C49A5C] uppercase tracking-wider">{slot.label}</span>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">your ad here</h3>
                <p className="text-sm text-[#6E6A60] leading-relaxed mb-4">{slot.desc}</p>
                <div className="flex items-center justify-between">
                  <a
                    href="mailto:ads@chickpea.kitchen"
                    className="flex items-center gap-2 text-sm font-semibold text-[#C49A5C] hover:gap-3 transition-all"
                  >
                    Get in touch <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
