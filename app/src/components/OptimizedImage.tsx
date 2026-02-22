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
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  placeholderColor = '#E8E6DC',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
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
      {!loaded && (
        <div className="absolute inset-0 shimmer-placeholder" />
      )}

      {/* Actual image — only starts loading when in view */}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${
            loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'
          }`}
        />
      )}
    </div>
  );
}
