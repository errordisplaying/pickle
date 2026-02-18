import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnerOffersSection() {
  return (
    <section className="section-flowing bg-warm-white py-12 px-[6vw] z-25">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs text-[#6E6A60] uppercase tracking-wider mb-8 text-center">Sponsored</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group bg-[#5C4A3A] rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
            <div className="relative h-48 overflow-hidden">
              <img src="/gallery_pasta_plate.jpg" alt="Meal Kit" className="w-full h-full object-cover image-grade opacity-50 transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-3 left-3">
                <span className="bg-white/20 backdrop-blur text-[10px] uppercase tracking-wider font-semibold text-white px-3 py-1 rounded-full">
                  Partner Offer
                </span>
              </div>
            </div>
            <div className="p-6 text-white">
              <h3 className="font-bold text-xl mb-2">Get 20% Off Your First Meal Kit</h3>
              <p className="text-sm opacity-80 mb-4 leading-relaxed">Fresh, pre-portioned ingredients delivered straight to your door. Skip the grocery store and start cooking restaurant-quality meals tonight. Use code SOUSCHEF20.</p>
              <Button className="bg-white text-[#5C4A3A] rounded-full hover:bg-white/90">
                Claim Offer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="group bg-white rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-black/5">
            <div className="relative h-48 overflow-hidden">
              <img src="/gallery_salad_bowl.jpg" alt="MasterClass" className="w-full h-full object-cover image-grade transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-3 left-3">
                <span className="bg-white/90 backdrop-blur text-[10px] uppercase tracking-wider font-semibold text-[#6E6A60] px-3 py-1 rounded-full">
                  Sponsored
                </span>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs text-[#8B7355] font-semibold uppercase tracking-wider mb-1">MasterClass</p>
              <h3 className="font-bold text-xl text-[#1A1A1A] mb-2">Gordon Ramsay Teaches Cooking</h3>
              <p className="text-sm text-[#6E6A60] mb-4 leading-relaxed">Learn knife skills, sauces, and plating techniques from the world's most famous chef. 20+ HD video lessons and exclusive recipes included.</p>
              <Button className="bg-[#1A1A1A] text-white rounded-full hover:bg-[#333]">
                Start Learning <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
