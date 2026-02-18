import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CtaSectionProps {
  ctaRef: React.RefObject<HTMLDivElement | null>;
  onStartCooking: () => void;
}

export default function CtaSection({ ctaRef, onStartCooking }: CtaSectionProps) {
  return (
    <>
      <section ref={ctaRef} className="section-flowing bg-warm-gray py-20 px-[6vw] z-[70]">
        <div className="max-w-5xl mx-auto">
          <div className="japandi-card overflow-hidden mb-10">
            <img
              src="/cta_final_table.jpg"
              alt="Shared meal"
              className="w-full h-[50vh] object-cover image-grade"
            />
          </div>

          <div className="text-center">
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black uppercase text-[#1A1A1A] leading-none mb-4">
              Start Cooking Today
            </h2>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Badge className="bg-[#8B7355] text-white rounded-full px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-1" /> Completely Free
              </Badge>
            </div>
            <p className="text-[#6E6A60] text-lg mb-8 max-w-xl mx-auto">
              No subscription required. No hidden fees. Just your ingredients and a little curiosity.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={onStartCooking}
                className="japandi-button bg-[#8B7355] text-white hover:bg-[#6B5740] text-lg px-10"
              >
                Try Pickle Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-gray py-12 px-[6vw] border-t border-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Pickle" className="w-8 h-8" />
              <span className="font-bold text-lg text-[#1A1A1A]">Pickle</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-[#6E6A60] hover:text-[#1A1A1A]">Privacy</a>
              <a href="#" className="text-sm text-[#6E6A60] hover:text-[#1A1A1A]">Terms</a>
              <a href="#" className="text-sm text-[#6E6A60] hover:text-[#1A1A1A]">Affiliate Disclosure</a>
            </div>
          </div>
          <p className="text-sm text-[#6E6A60] text-center">
            Pickle is a free service. We earn commissions through affiliate links at no extra cost to you.
          </p>
          <p className="text-xs text-[#6E6A60]/70 text-center mt-2">
            From everyday home cook to professional chef
          </p>
        </div>
      </footer>
    </>
  );
}