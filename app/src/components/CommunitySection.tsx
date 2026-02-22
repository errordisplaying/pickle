import { communityRecipes } from '@/data';
import { toTitleCase } from '@/utils';
import OptimizedImage from '@/components/OptimizedImage';

interface CommunitySectionProps {
  communityRef: React.RefObject<HTMLDivElement | null>;
}

export default function CommunitySection({ communityRef }: CommunitySectionProps) {
  return (
    <section ref={communityRef} className="section-flowing bg-warm-white py-20 px-[6vw] z-[60]">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black lowercase text-[#1A1A1A] leading-none mb-4">
          made by the community
        </h2>
        <p className="text-[#6E6A60] text-lg">
          Save, remix, and share your own spins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communityRecipes.map((recipe, idx) => (
          <div
            key={idx}
            className="group japandi-card bg-white cursor-pointer card-hover"
          >
            <div className="relative h-64 overflow-hidden rounded-[28px]">
              <OptimizedImage
                src={recipe.image}
                alt={recipe.name}
                className="w-full h-full image-grade transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <p className="text-white font-medium">by {recipe.author}</p>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-[#1A1A1A]">{toTitleCase(recipe.name)}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}