import { useState } from 'react';
import { Leaf, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { swapCategories, smartSwaps } from '@/data';

interface SmartSwapSectionProps {
  substituteRef: React.RefObject<HTMLDivElement | null>;
}

export default function SmartSwapSection({ substituteRef }: SmartSwapSectionProps) {
  const [activeSwapCategory, setActiveSwapCategory] = useState<string>('all');

  return (
    <section ref={substituteRef} className="section-pinned z-30">
      <div className="absolute inset-0 bg-warm-white" />

      {/* Left - Header + Category Filters + Image */}
      <div className="substitute-image absolute left-[6vw] top-[14vh] w-[42vw] flex flex-col">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black lowercase text-[#1A1A1A] leading-none mb-3">
          Smart Swap
        </h2>
        <p className="text-[#6E6A60] text-lg leading-relaxed mb-5 max-w-[36vw]">
          Have dietary restrictions or just out of an ingredient? Select your need and we'll show you perfect swaps that keep flavor and texture intact.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {swapCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSwapCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeSwapCategory === cat.id
                  ? 'bg-[#C49A5C] text-white shadow-md'
                  : 'bg-white text-[#6E6A60] hover:bg-[#E8E6DC] border border-black/5'
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Image */}
        <div className="h-[36vh] japandi-card">
          <img src="/substitute_eggs_dairy.jpg" alt="Ingredients" className="w-full h-full object-cover image-grade" />
        </div>
      </div>

      {/* Swap Badge */}
      <div className="substitute-badge absolute left-[10vw] bottom-[6vh] bg-[#C49A5C] text-white px-6 py-3 rounded-full font-semibold shadow-xl">
        <Leaf className="w-4 h-4 inline mr-2" />
        {activeSwapCategory === 'all' ? 'All dietary swaps' : swapCategories.find(c => c.id === activeSwapCategory)?.label + ' swaps active'}
      </div>

      {/* Right - Swap Cards */}
      <div className="substitute-text absolute left-[52vw] top-[14vh] w-[42vw] h-[76vh] overflow-y-auto pr-4 swap-scroll">
        <div className="space-y-3">
          {smartSwaps
            .filter(s => activeSwapCategory === 'all' || s.category === activeSwapCategory)
            .map((swap, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-black/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#E8E6DC] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Leaf className="w-5 h-5 text-[#C49A5C]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1A1A1A]">{swap.original}</span>
                      <ArrowRight className="w-4 h-4 text-[#C49A5C]" />
                      <span className="font-semibold text-[#C49A5C]">{swap.swap}</span>
                    </div>
                    <p className="text-sm text-[#6E6A60] mt-1 leading-relaxed">{swap.note}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-[#E8E6DC] text-[#6E6A60] rounded-full text-xs border-0">
                        Ratio: {swap.ratio}
                      </Badge>
                      <Badge className="bg-[#C49A5C]/10 text-[#C49A5C] rounded-full text-xs border-0">
                        {swapCategories.find(c => c.id === swap.category)?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
