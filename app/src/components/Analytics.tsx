import { useEffect } from 'react';

/**
 * Privacy-friendly analytics loader.
 *
 * Loads Umami Cloud analytics script when VITE_UMAMI_WEBSITE_ID is set.
 * Umami is GDPR/CCPA compliant by default — no cookies, no personal data,
 * no tracking across sites. Set up a free account at https://cloud.umami.is
 *
 * To enable:
 * 1. Sign up at https://cloud.umami.is (free tier)
 * 2. Add your domain and get a website ID
 * 3. Set VITE_UMAMI_WEBSITE_ID in your .env file
 * 4. Optionally set VITE_UMAMI_SRC if self-hosting (defaults to Umami Cloud)
 */
export default function Analytics() {
  useEffect(() => {
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
    if (!websiteId) return; // Analytics disabled — no env var set

    const src = import.meta.env.VITE_UMAMI_SRC || 'https://cloud.umami.is/script.js';

    // Don't double-load
    if (document.querySelector(`script[data-website-id="${websiteId}"]`)) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    script.setAttribute('data-website-id', websiteId);

    // Respect Do Not Track
    script.setAttribute('data-do-not-track', 'true');
    // Don't track localhost
    script.setAttribute('data-domains', 'chickpea.kitchen');

    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount (unlikely in prod, but good practice)
      try { document.head.removeChild(script); } catch { /* ignore */ }
    };
  }, []);

  return null; // Renders nothing — this is a side-effect-only component
}
