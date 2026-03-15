import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
}

/**
 * Lazy-loaded image with blur-up placeholder effect.
 * Uses IntersectionObserver to defer loading until the image is near the viewport,
 * then fades in from a blurred low-opacity state once loaded.
 * Shows a graceful fallback if the image fails to load.
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  placeholderColor = '#E8E6DC',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Observe when the image container enters the viewport
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Shimmer placeholder while loading */}
      {!loaded && !errored && (
        <div className="absolute inset-0 shimmer-placeholder" />
      )}

      {/* Broken image fallback */}
      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#E8E6DC]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A8A49A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs text-[#A8A49A] mt-2 font-medium">{alt || 'Image unavailable'}</span>
        </div>
      )}

      {/* Actual image — only starts loading when in view */}
      {inView && !errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${
            loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'
          }`}
        />
      )}
    </div>
  );
}
