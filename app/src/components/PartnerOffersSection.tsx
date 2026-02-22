import { Megaphone, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnerOffersSection() {
  return (
    <section className="section-flowing bg-warm-white py-12 px-[6vw] z-25">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs text-[#6E6A60] uppercase tracking-wider mb-8 text-center">Partner With Us</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Premium Placement — dark card */}
          <div className="group bg-[#2A2520] rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer card-hover border-2 border-dashed border-[#C49A5C]/20 hover:border-[#C49A5C]/40">
            <div className="relative h-48 flex flex-col items-center justify-center bg-gradient-to-br from-[#C49A5C]/15 to-transparent">
              <div className="w-20 h-20 rounded-2xl bg-[#C49A5C]/20 flex items-center justify-center mb-3">
                <Sparkles className="w-9 h-9 text-[#C49A5C]" />
              </div>
              <span className="text-xs font-semibold text-[#C49A5C] uppercase tracking-wider">Premium Placement</span>
            </div>
            <div className="p-6 text-white">
              <h3 className="font-bold text-xl mb-2">promote your brand here</h3>
              <p className="text-sm opacity-70 mb-4 leading-relaxed">
                Prime real estate for meal kits, kitchen brands, and food products. Your offer in front of home cooks who are actively planning meals and exploring recipes.
              </p>
              <Button
                asChild
                className="bg-[#C49A5C] text-white rounded-full hover:bg-[#8B6F3C] btn-press"
              >
                <a href="mailto:ads@chickpea.kitchen">
                  Advertise With Us <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>

          {/* Standard Placement — white card */}
          <div className="group bg-white rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer card-hover border-2 border-dashed border-[#C49A5C]/20 hover:border-[#C49A5C]/40">
            <div className="relative h-48 flex flex-col items-center justify-center bg-[#F4F2EA]">
              <div className="w-20 h-20 rounded-2xl bg-[#E8E6DC] flex items-center justify-center mb-3">
                <Megaphone className="w-9 h-9 text-[#C49A5C]/50" />
              </div>
              <span className="text-xs font-semibold text-[#C49A5C]/60 uppercase tracking-wider">Standard Placement</span>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl text-[#1A1A1A] mb-2">your ad here</h3>
              <p className="text-sm text-[#6E6A60] mb-4 leading-relaxed">
                Reach a growing audience of cooking enthusiasts. Perfect for cookbooks, cooking courses, specialty ingredients, and kitchen gadgets.
              </p>
              <Button
                asChild
                className="bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] btn-press"
              >
                <a href="mailto:ads@chickpea.kitchen">
                  Learn More <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
