import { Sparkles, ArrowUp, Heart, Mail } from 'lucide-react';
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
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black lowercase text-[#1A1A1A] leading-none mb-4">
              start cooking today
            </h2>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Badge className="bg-[#C49A5C] text-white rounded-full px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-1" /> completely free
              </Badge>
            </div>
            <p className="text-[#6E6A60] text-lg mb-8 max-w-xl mx-auto">
              No subscription required. No hidden fees. Just your ingredients and a little curiosity.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={onStartCooking}
                className="japandi-button bg-[#C49A5C] text-white hover:bg-[#8B6F3C] text-lg px-10"
              >
                Try chickpea Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2A2520] py-16 px-[6vw]">
        <div className="max-w-6xl mx-auto">
          {/* Top: Logo + tagline */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="chickpea logo">
                  <ellipse cx="32" cy="34" rx="26" ry="24" fill="#D4A96A" />
                  <ellipse cx="32" cy="34" rx="26" ry="24" fill="url(#chickpea-grad-ft)" />
                  <path d="M32 14 C30 22, 26 30, 28 54" stroke="#C49555" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
                  <ellipse cx="24" cy="28" rx="8" ry="5" fill="white" opacity="0.18" transform="rotate(-20 24 28)" />
                  <circle cx="32" cy="12" r="5" fill="#8B9E6B" />
                  <circle cx="28" cy="10" r="3.5" fill="#7A8E5C" />
                  <defs>
                    <radialGradient id="chickpea-grad-ft" cx="0.35" cy="0.3" r="0.7">
                      <stop offset="0%" stopColor="#E8C088" />
                      <stop offset="100%" stopColor="#B8864A" />
                    </radialGradient>
                  </defs>
                </svg>
                <span className="font-bold text-xl text-white tracking-tight">chickpea</span>
              </div>
              <p className="text-[#A09A90] text-sm max-w-xs leading-relaxed">
                Discover recipes from ingredients you already have. No waste, no fuss.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12">
              <div>
                <p className="text-xs font-semibold text-[#C49A5C] uppercase tracking-wider mb-3">Product</p>
                <div className="space-y-2">
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Recipes</a>
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Meal Planner</a>
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Nutrition</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#C49A5C] uppercase tracking-wider mb-3">Legal</p>
                <div className="space-y-2">
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Privacy</a>
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Terms</a>
                  <a href="#" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Affiliates</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#C49A5C] uppercase tracking-wider mb-3">Contact</p>
                <div className="space-y-2">
                  <a href="mailto:lokekhayvin@gmail.com" className="flex items-center gap-1.5 text-sm text-[#A09A90] hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5" /> Email Us
                  </a>
                  <a href="mailto:ads@chickpea.kitchen" className="block text-sm text-[#A09A90] hover:text-white transition-colors">Advertise</a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/10 mb-8" />

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#6E6A60]">
              © {new Date().getFullYear()} ViN. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#6E6A60]">
              <span>Made with</span>
              <Heart className="w-3 h-3 fill-[#C49A5C] text-[#C49A5C]" />
              <span>for home cooks everywhere</span>
            </div>
          </div>

          {/* Back to top */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#A09A90] hover:text-white transition-all"
              aria-label="Back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
