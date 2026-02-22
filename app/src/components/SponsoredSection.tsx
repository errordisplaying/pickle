import { ArrowRight } from 'lucide-react';
import { affiliateProducts } from '@/data';

interface SponsoredSectionProps {
  title?: string;
  className?: string;
}

export default function SponsoredSection({ title = 'Sponsored', className = '' }: SponsoredSectionProps) {
  return (
    <section className={`section-flowing bg-warm-white py-12 px-[6vw] ${className}`}>
      <div className="max-w-6xl mx-auto">
        <p className="text-xs text-[#6E6A60] uppercase tracking-wider mb-8 text-center">{title}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {affiliateProducts.map((product, idx) => (
            <div key={idx} className="group bg-white rounded-[28px] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover image-grade transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur text-[10px] uppercase tracking-wider font-semibold text-[#6E6A60] px-3 py-1 rounded-full">
                    Sponsored
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-[#C49A5C] font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
                <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">{product.name}</h3>
                <p className="text-sm text-[#6E6A60] leading-relaxed mb-4">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#C49A5C] font-bold text-lg">{product.price}</span>
                  <button className="flex items-center gap-2 text-sm font-semibold text-[#C49A5C] hover:gap-3 transition-all">
                    {product.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
