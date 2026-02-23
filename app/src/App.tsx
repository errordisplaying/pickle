import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

import type { SavedRecipe, PlannerWeek, Toast, DietaryFilter, NutritionGoals, ShoppingItem, UserProfile, ScoredRecipe } from '@/types';
import { DEFAULT_NUTRITION_GOALS, STORAGE_KEYS } from '@/constants';
import { demoRecipes, suggestedRecipes } from '@/data';
import {
  loadFromStorage, saveToStorage,
  normalizeScrapedRecipe,
  defaultPlannerWeek, migratePlannerData,
  getWeeklyNutrition,
  toTitleCase, formatRecipeShareText, extractIngredientsFromPlanner,
} from '@/utils';
import { buildTasteProfile, getPersonalizedRecipes } from '@/utils/recommendations';
import { initAnalytics, trackEvent, setAnalyticsUserId, EVENTS } from '@/utils/analytics';

import ToastNotifications from '@/components/ToastNotifications';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import SponsoredSection from '@/components/SponsoredSection';
import GallerySection from '@/components/GallerySection';
import PartnerOffersSection from '@/components/PartnerOffersSection';
import SmartSwapSection from '@/components/SmartSwapSection';
import PlannerPreviewSection from '@/components/PlannerPreviewSection';
import PlannerOverlay from '@/components/PlannerOverlay';
import ExportCalendarModal from '@/components/ExportCalendarModal';
import FavoritesOverlay from '@/components/FavoritesOverlay';
import NutritionSection from '@/components/NutritionSection';
import CommunitySection from '@/components/CommunitySection';
import CtaSection from '@/components/CtaSection';
import NutritionGoalsModal from '@/components/NutritionGoalsModal';
import ShoppingListOverlay from '@/components/ShoppingListOverlay';
import AuthModal from '@/components/AuthModal';
import RecipeDetailOverlay from '@/components/RecipeDetailOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import Analytics from '@/components/Analytics';

gsap.registerPlugin(ScrollTrigger);

function App() {
  // Recipe Finder State
  const [ingredients, setIngredients] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [strictness, setStrictness] = useState('flexible');
  const [loading, setLoading] = useState(false);
  const [recipeData, setRecipeData] = useState<any>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  // Test Kitchen mode (kept at App level for Navbar)
  const [mode, setMode] = useState<'recipe' | 'testKitchen'>('recipe');

  // Planner state (persisted to localStorage)
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerMeals, setPlannerMeals] = useState<PlannerWeek>(() =>
    migratePlannerData(loadFromStorage(STORAGE_KEYS.PLANNER, defaultPlannerWeek))
  );
  const [plannerActiveDay, setPlannerActiveDay] = useState('Mon');
  const [recipeToAssign, setRecipeToAssign] = useState<SavedRecipe | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Favorites state (persisted to localStorage)
  const [favorites, setFavorites] = useState<SavedRecipe[]>(() =>
    loadFromStorage<SavedRecipe[]>(STORAGE_KEYS.FAVORITES, [])
  );
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  // Recently scraped recipes (for planner suggestions, persisted)
  const [recentRecipes, setRecentRecipes] = useState<SavedRecipe[]>(() =>
    loadFromStorage<SavedRecipe[]>(STORAGE_KEYS.RECENT_RECIPES, [])
  );

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Dietary filters
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<DietaryFilter[]>([]);

  // Serving size
  const [servingMultiplier, setServingMultiplier] = useState<number>(1);

  // Nutritional goals
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(() =>
    loadFromStorage<NutritionGoals>(STORAGE_KEYS.NUTRITION_GOALS, DEFAULT_NUTRITION_GOALS)
  );
  const [goalsSettingsOpen, setGoalsSettingsOpen] = useState(false);

  // Shopping list
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() =>
    loadFromStorage<ShoppingItem[]>(STORAGE_KEYS.SHOPPING_LIST, [])
  );

  // Gallery personalization
  const [selectedGalleryRecipe, setSelectedGalleryRecipe] = useState<SavedRecipe | null>(null);
  const [personalizedRecipes, setPersonalizedRecipes] = useState<ScoredRecipe[]>([]);

  // ── Auth / Cloud Sync State ─────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const substituteRef = useRef<HTMLDivElement>(null);
  const plannerRef = useRef<HTMLDivElement>(null);
  const nutritionRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Section navigation
  const [nextSectionLabel, setNextSectionLabel] = useState('Recipes');

  const sectionNames = ['Hero', 'Nutrition', 'Recipes', 'Smart Swap', 'Planner', 'Community', 'Get Started'];
  const sectionRefsList = [heroRef, nutritionRef, galleryRef, substituteRef, plannerRef, communityRef, ctaRef];

  /**
   * Get the ideal scroll position for each section.
   * - Pinned sections: scroll to 35% through the pin range so the entrance animation
   *   is complete and content is fully visible (animations enter 0→0.6, exit 0.7→1.0).
   * - Flowing sections: use the pin spacer's offsetTop which is stable in the document
   *   flow and already accounts for all pin spacers above it.
   * - Hero: always position 0 (top of page).
   */
  const getSectionPositions = () => {
    const triggers = ScrollTrigger.getAll();
    const positions: { name: string; top: number }[] = [];

    sectionRefsList.forEach((ref, i) => {
      if (!ref.current) return;

      // Hero always scrolls to top
      if (sectionNames[i] === 'Hero') {
        positions.push({ name: sectionNames[i], top: 0 });
        return;
      }

      const matchedTrigger = triggers.find(t => t.trigger === ref.current);
      if (matchedTrigger) {
        // Pinned section: scroll to 35% through the pin so content is fully visible
        const pinRange = matchedTrigger.end - matchedTrigger.start;
        positions.push({ name: sectionNames[i], top: matchedTrigger.start + pinRange * 0.35 });
      } else {
        // Flowing section: use the GSAP pin spacer parent or the element's own
        // document offset. The pin spacer (if present) is the wrapper GSAP inserts;
        // its offsetTop is stable and accounts for all pin spacers above.
        const pinSpacer = ref.current.closest('.pin-spacer') as HTMLElement | null;
        const el = pinSpacer || ref.current;
        // Calculate absolute offset from document top
        let top = 0;
        let current: HTMLElement | null = el;
        while (current) {
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        positions.push({ name: sectionNames[i], top });
      }
    });

    positions.sort((a, b) => a.top - b.top);
    return positions;
  };

  // Update next-section label on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const positions = getSectionPositions();

      // Find the next section that's at least 100px below current scroll
      const next = positions.find(p => p.top > scrollY + 100);
      if (next) {
        setNextSectionLabel(next.name);
      } else {
        setNextSectionLabel('Back to Top');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToNextSection = () => {
    const scrollY = window.scrollY;
    const positions = getSectionPositions();

    const next = positions.find(p => p.top > scrollY + 100);
    if (next) {
      window.scrollTo({ top: next.top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Initialize GSAP ScrollTrigger animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Section Animations
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        }
      });

      heroTl
        .fromTo('.hero-image',
          { x: 0, y: 0, scale: 1, opacity: 1 },
          { x: '-28vw', y: '10vh', scale: 0.92, opacity: 0, ease: 'power2.in' },
          0.7
        )
        .fromTo('.hero-panel',
          { x: 0, y: 0, opacity: 1 },
          { x: '18vw', y: '-6vh', opacity: 0, ease: 'power2.in' },
          0.7
        )
        .fromTo('.hero-headline',
          { y: 0, opacity: 1 },
          { y: '-10vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Nutrition Section (2nd — right after Hero)
      const nutritionTl = gsap.timeline({
        scrollTrigger: {
          trigger: nutritionRef.current,
          start: "top top",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        }
      });

      nutritionTl
        .fromTo('.nutrition-image',
          { x: '-70vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power3.out' },
          0
        )
        .fromTo('.nutrition-panel',
          { x: '45vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0.08
        )
        .fromTo('.macro-row',
          { x: '6vw', opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.06, ease: 'power2.out' },
          0.16
        )
        .to('.nutrition-image',
          { x: '-18vw', opacity: 0, ease: 'power2.in' },
          0.7
        )
        .to('.nutrition-panel',
          { x: '18vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Gallery Section
      const galleryTl = gsap.timeline({
        scrollTrigger: {
          trigger: galleryRef.current,
          start: "top top",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        }
      });

      galleryTl
        .fromTo('.gallery-text',
          { x: '-40vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo('.gallery-cards',
          { x: '60vw', opacity: 0, scale: 0.96 },
          { x: 0, opacity: 1, scale: 1, ease: 'power3.out' },
          0.06
        )
        .fromTo('.gallery-card',
          { y: '18vh', opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.06, ease: 'power2.out' },
          0.1
        )
        .to('.gallery-text',
          { x: '-12vw', opacity: 0, ease: 'power2.in' },
          0.7
        )
        .to('.gallery-cards',
          { x: '-18vw', y: '8vh', scale: 0.95, opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Substitute Section
      const substituteTl = gsap.timeline({
        scrollTrigger: {
          trigger: substituteRef.current,
          start: "top top",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        }
      });

      substituteTl
        .fromTo('.substitute-image',
          { x: '-70vw', opacity: 0, scale: 0.98 },
          { x: 0, opacity: 1, scale: 1, ease: 'power3.out' },
          0
        )
        .fromTo('.substitute-text',
          { x: '45vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0.08
        )
        .fromTo('.substitute-badge',
          { y: '12vh', scale: 0.85, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, ease: 'back.out(1.4)' },
          0.18
        )
        .to('.substitute-image',
          { x: '18vw', y: '-10vh', opacity: 0, ease: 'power2.in' },
          0.7
        )
        .to('.substitute-text',
          { x: '18vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Planner Section
      const plannerTl = gsap.timeline({
        scrollTrigger: {
          trigger: plannerRef.current,
          start: "top top",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        }
      });

      plannerTl
        .fromTo('.planner-text',
          { x: '-40vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'power2.out' },
          0
        )
        .fromTo('.planner-card',
          { x: '70vw', opacity: 0, rotate: 1 },
          { x: 0, opacity: 1, rotate: 0, ease: 'power3.out' },
          0.06
        )
        .fromTo('.day-tile',
          { y: '18vh', scale: 0.92, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, stagger: 0.04, ease: 'power2.out' },
          0.14
        )
        .to('.planner-card',
          { y: '-14vh', scale: 0.94, opacity: 0, ease: 'power2.in' },
          0.7
        )
        .to('.planner-text',
          { x: '-10vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

    }, mainRef);

    return () => ctx.revert();
  }, []);

  // ── localStorage Persistence ──────────────────────────────────
  useEffect(() => { saveToStorage(STORAGE_KEYS.FAVORITES, favorites); }, [favorites]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PLANNER, plannerMeals); }, [plannerMeals]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.RECENT_RECIPES, recentRecipes); }, [recentRecipes]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.NUTRITION_GOALS, nutritionGoals); }, [nutritionGoals]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SHOPPING_LIST, shoppingList); }, [shoppingList]);
  useEffect(() => {
    if (servingMultiplier !== 1) {
      trackEvent(EVENTS.SERVING_SIZE_CHANGED, { multiplier: servingMultiplier });
    }
  }, [servingMultiplier]);
  useEffect(() => { setServingMultiplier(1); }, [expandedRecipe]);

  // ── Analytics Initialization ────────────────────────────────────
  useEffect(() => {
    const cleanup = initAnalytics();
    return cleanup;
  }, []);

  // ── Personalized Gallery Recommendations ───────────────────────
  useEffect(() => {
    const profile = buildTasteProfile(favorites, plannerMeals, recentRecipes);
    saveToStorage(STORAGE_KEYS.TASTE_PROFILE, profile);
    const recipes = getPersonalizedRecipes(suggestedRecipes, profile, 9, nutritionGoals);
    setPersonalizedRecipes(recipes);
  }, [favorites, plannerMeals, recentRecipes, nutritionGoals]);

  // ── Supabase Auth Initialization ────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadUserProfile(s.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        if (s?.user) {
          loadUserProfile(s.user.id);
          setAnalyticsUserId(s.user.id);
          trackEvent(EVENTS.USER_SIGNED_IN);
        } else {
          setUserProfile(null);
          setAnalyticsUserId(undefined);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Cloud Sync — debounced push when logged in ──────────────
  const syncToCloud = useCallback(async () => {
    if (!supabase || !session?.user) return;
    setCloudSyncing(true);
    try {
      const userId = session.user.id;
      await Promise.all([
        supabase.from('favorites').upsert({
          user_id: userId,
          data: favorites,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
        supabase.from('meal_plans').upsert({
          user_id: userId,
          data: plannerMeals,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
        supabase.from('shopping_lists').upsert({
          user_id: userId,
          data: shoppingList,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
        supabase.from('nutrition_goals').upsert({
          user_id: userId,
          data: nutritionGoals,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
      ]);
    } catch (err) {
      console.warn('Cloud sync failed:', err);
    } finally {
      setCloudSyncing(false);
    }
  }, [session, favorites, plannerMeals, shoppingList, nutritionGoals]);

  // Debounced sync effect: auto-push changes to cloud after 2s of inactivity
  useEffect(() => {
    if (!session?.user) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncToCloud();
    }, 2000);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [favorites, plannerMeals, shoppingList, nutritionGoals, syncToCloud]);

  // ── Auth Helper Functions ───────────────────────────────────
  const loadUserProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setUserProfile(data as UserProfile);
  };

  const loadCloudData = async () => {
    if (!supabase || !session?.user) return;
    try {
      const userId = session.user.id;
      const [favRes, planRes, shopRes, goalRes] = await Promise.all([
        supabase.from('favorites').select('data').eq('user_id', userId).single(),
        supabase.from('meal_plans').select('data').eq('user_id', userId).single(),
        supabase.from('shopping_lists').select('data').eq('user_id', userId).single(),
        supabase.from('nutrition_goals').select('data').eq('user_id', userId).single(),
      ]);

      if (favRes.data?.data) setFavorites(favRes.data.data);
      if (planRes.data?.data) setPlannerMeals(migratePlannerData(planRes.data.data));
      if (shopRes.data?.data) setShoppingList(shopRes.data.data);
      if (goalRes.data?.data) setNutritionGoals(goalRes.data.data);

      showToast('Data synced from cloud', 'success');
    } catch (err) {
      console.warn('Cloud data load failed:', err);
      showToast('Could not load cloud data', 'warning');
    }
  };

  const syncLocalDataToCloud = async () => {
    if (!supabase || !session?.user) return;
    setCloudSyncing(true);
    try {
      await syncToCloud();
      showToast('Data synced to cloud', 'success');
    } catch {
      showToast('Sync failed', 'error');
    } finally {
      setCloudSyncing(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    trackEvent(EVENTS.USER_SIGNED_OUT);
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setAnalyticsUserId(undefined);
    showToast('Signed out', 'info');
  };

  // Load cloud data on first sign-in
  useEffect(() => {
    if (session?.user && supabase) {
      loadCloudData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // ── Favorites Helpers ────────────────────────────────────────
  const isFavorite = (recipeName: string): boolean =>
    favorites.some(f => f.name.toLowerCase() === recipeName.toLowerCase());

  const toggleFavorite = (recipe: SavedRecipe) => {
    const exists = favorites.some(f => f.name.toLowerCase() === recipe.name.toLowerCase());
    trackEvent(exists ? EVENTS.RECIPE_UNFAVORITED : EVENTS.RECIPE_FAVORITED, {
      recipeName: recipe.name, tags: recipe.tags, calories: recipe.nutrition.calories, difficulty: recipe.difficulty,
    });
    setFavorites(prev => {
      if (exists) return prev.filter(f => f.name.toLowerCase() !== recipe.name.toLowerCase());
      return [...prev, { ...recipe, savedAt: Date.now() }];
    });
    showToast(exists ? 'Removed from favorites' : 'Recipe saved!', exists ? 'info' : 'success');
  };

  const removeFavorite = (recipeId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== recipeId));
    showToast('Recipe removed', 'info');
  };

  // ── Planner Helpers ──────────────────────────────────────────
  const addRecipeToPlanner = (recipe: SavedRecipe, day: string, slot: 'breakfast' | 'lunch' | 'dinner') => {
    trackEvent(EVENTS.RECIPE_ADDED_TO_PLANNER, { recipeName: recipe.name, day, slot, tags: recipe.tags });
    setPlannerMeals(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: recipe }
    }));
    setRecipeToAssign(null);
    showToast(`Added to ${day}'s ${slot}`, 'success');
  };

  const removeFromPlanner = (day: string, slot: 'breakfast' | 'lunch' | 'dinner') => {
    trackEvent(EVENTS.RECIPE_REMOVED_FROM_PLANNER, { day, slot });
    setPlannerMeals(prev => ({
      ...prev,
      [day]: { ...prev[day], [slot]: null }
    }));
    showToast('Meal removed', 'info');
  };

  const clearPlannerDay = (day: string) => {
    trackEvent(EVENTS.PLANNER_DAY_CLEARED, { day });
    setPlannerMeals(prev => ({
      ...prev,
      [day]: { breakfast: null, lunch: null, dinner: null }
    }));
    showToast(`${day} cleared`, 'info');
  };

  const clearPlannerWeek = () => {
    trackEvent(EVENTS.PLANNER_WEEK_CLEARED);
    setPlannerMeals({ ...defaultPlannerWeek });
    showToast('Week cleared', 'info');
  };

  // ── Toast Notifications ─────────────────────────────────────────
  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // ── Dietary Filter Toggle ──────────────────────────────────────
  const toggleDietaryFilter = (filter: DietaryFilter) => {
    const isActive = activeDietaryFilters.includes(filter);
    trackEvent(EVENTS.DIETARY_FILTER_TOGGLED, { filter, active: !isActive });
    setActiveDietaryFilters(prev =>
      isActive ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const shareRecipe = async (recipe: any) => {
    trackEvent(EVENTS.RECIPE_SHARED, { recipeName: recipe.name });
    const text = formatRecipeShareText(recipe);
    if (navigator.share) {
      try {
        await navigator.share({ title: toTitleCase(recipe.name || ''), text });
        showToast('Shared successfully!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(text);
          showToast('Copied to clipboard!', 'success');
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    }
  };

  const shareMealPlan = async () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const lines: string[] = ['\u{1F37D}\uFE0F My Meal Plan — chickpea', ''];
    days.forEach(day => {
      const dayMeals = plannerMeals[day];
      const slots = (['breakfast', 'lunch', 'dinner'] as const).filter(s => dayMeals?.[s]);
      if (slots.length === 0) return;
      lines.push(`${day}:`);
      slots.forEach(slot => {
        const recipe = dayMeals[slot] as SavedRecipe;
        lines.push(`  ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${toTitleCase(recipe.name)}${recipe.nutrition.calories > 0 ? ` (${recipe.nutrition.calories} cal)` : ''}`);
      });
      lines.push('');
    });
    const weeklyN = getWeeklyNutrition(plannerMeals);
    if (weeklyN.calories > 0) {
      lines.push(`Weekly: ${weeklyN.calories} cal | ${weeklyN.protein}g P | ${weeklyN.carbs}g C | ${weeklyN.fat}g F`);
    }
    lines.push('', 'Planned with chickpea');
    const daysPlanned = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter(day => {
      const d = plannerMeals[day];
      return d?.breakfast || d?.lunch || d?.dinner;
    }).length;
    trackEvent(EVENTS.MEAL_PLAN_SHARED, { daysPlanned });
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Meal plan copied to clipboard!', 'success');
  };

  const generateShoppingList = () => {
    const extracted = extractIngredientsFromPlanner(plannerMeals);
    trackEvent(EVENTS.SHOPPING_LIST_GENERATED, { itemCount: extracted.length });
    setShoppingList(extracted);
    showToast(`Generated ${extracted.length} items from your meal plan`, 'success');
  };

  const toggleShoppingItem = (itemId: string) => {
    const item = shoppingList.find(i => i.id === itemId);
    if (item) {
      trackEvent(EVENTS.SHOPPING_ITEM_CHECKED, { itemName: item.name, category: item.category });
    }
    setShoppingList(prev =>
      prev.map(i => i.id === itemId ? { ...i, purchased: !i.purchased } : i)
    );
  };

  const clearPurchasedItems = () => {
    setShoppingList(prev => prev.filter(item => !item.purchased));
    showToast('Purchased items cleared', 'info');
  };

  const clearShoppingList = () => {
    setShoppingList([]);
    showToast('Shopping list cleared', 'info');
  };

  // Recipe Finder Functions
  const getDemoRecipes = (ingredientList: string) => {
    const ingredientsLower = ingredientList.toLowerCase();
    let selectedRecipes: any[] = [];

    if (ingredientsLower.includes('chicken')) selectedRecipes.push(...demoRecipes.chicken);
    if (ingredientsLower.includes('beef') || ingredientsLower.includes('steak')) selectedRecipes.push(...demoRecipes.beef);
    if (ingredientsLower.includes('shrimp') || ingredientsLower.includes('salmon') || ingredientsLower.includes('fish')) selectedRecipes.push(...demoRecipes.seafood);
    if (ingredientsLower.includes('pasta') || ingredientsLower.includes('spaghetti')) selectedRecipes.push(...demoRecipes.pasta);
    if (ingredientsLower.includes('tofu') || ingredientsLower.includes('vegetable') || ingredientsLower.includes('mushroom')) selectedRecipes.push(...demoRecipes.vegetarian);
    if (ingredientsLower.includes('rice') || ingredientsLower.includes('egg')) selectedRecipes.push(...demoRecipes.quick);

    if (selectedRecipes.length === 0) {
      selectedRecipes = [demoRecipes.chicken[0], demoRecipes.pasta[0], demoRecipes.quick[0]];
    }

    return selectedRecipes.slice(0, 3);
  };

  const findRecipes = async () => {
    if (!ingredients.trim()) return;
    trackEvent(EVENTS.RECIPE_SEARCH, {
      ingredients: ingredients.trim(),
      timeAvailable: timeAvailable.trim() || null,
      cuisine: cuisine.trim() || null,
      strictness,
      dietaryFilters: activeDietaryFilters,
    });
    setLoading(true);
    setRecipeData(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredients.trim(),
          timeAvailable: timeAvailable.trim() || undefined,
          cuisine: [cuisine.trim(), ...activeDietaryFilters.map(f => f.toLowerCase())].filter(Boolean).join(' ') || undefined,
          strictness,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recipes && data.recipes.length > 0) {
          setRecipeData({ recipes: data.recipes, source: data.source });
          // Track recently scraped recipes for planner suggestions
          const normalized = data.recipes.map((r: any) => normalizeScrapedRecipe(r, 'scraped'));
          setRecentRecipes(prev => {
            const combined = [...normalized, ...prev];
            const seen = new Set<string>();
            return combined.filter((r: SavedRecipe) => {
              const key = r.name.toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }).slice(0, 20);
          });
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('API unavailable, falling back to demo recipes:', error);
    }

    // Fallback to demo recipes if API fails or returns nothing
    const recipes = getDemoRecipes(ingredients);
    setRecipeData({ recipes, source: 'demo' });
    // Track demo recipes for planner suggestions too
    const normalized = recipes.map((r: any) => normalizeScrapedRecipe(r, 'demo'));
    setRecentRecipes(prev => {
      const combined = [...normalized, ...prev];
      const seen = new Set<string>();
      return combined.filter((r: SavedRecipe) => {
        const key = r.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 20);
    });
    setLoading(false);
  };

  return (
    <div ref={mainRef} className="relative bg-warm-white">
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Floating Next Section Arrow */}
      <button
        onClick={scrollToNextSection}
        className="fixed right-5 top-1/2 -translate-y-1/2 z-[100] group flex items-center gap-2 cursor-pointer"
        aria-label={`Go to ${nextSectionLabel}`}
      >
        <span className="px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-[#C49A5C]/15 text-[11px] font-semibold text-[#C49A5C] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 whitespace-nowrap shadow-sm">
          {nextSectionLabel}
        </span>
        <div className="w-11 h-11 rounded-full bg-white/50 backdrop-blur-md border border-[#C49A5C]/20 text-[#C49A5C] shadow-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/70 group-hover:shadow-md group-hover:border-[#C49A5C]/40 animate-bounce-subtle">
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {/* Navigation */}
      <Navbar
        mode={mode}
        setMode={setMode}
        favorites={favorites}
        shoppingList={shoppingList}
        session={session}
        userProfile={userProfile}
        cloudSyncing={cloudSyncing}
        onOpenPlanner={() => setPlannerOpen(true)}
        onOpenShoppingList={() => setShoppingListOpen(true)}
        onOpenFavorites={() => setFavoritesOpen(true)}
        onOpenGoalsSettings={() => setGoalsSettingsOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSyncToCloud={syncLocalDataToCloud}
        onSignOut={signOut}
      />

      {/* Section 1: Hero */}
      <HeroSection
        heroRef={heroRef}
        mode={mode}
        setMode={setMode}
        ingredients={ingredients}
        setIngredients={setIngredients}
        timeAvailable={timeAvailable}
        setTimeAvailable={setTimeAvailable}
        cuisine={cuisine}
        setCuisine={setCuisine}
        strictness={strictness}
        setStrictness={setStrictness}
        loading={loading}
        activeDietaryFilters={activeDietaryFilters}
        onToggleDietaryFilter={toggleDietaryFilter}
        onFindRecipes={findRecipes}
        recipeData={recipeData}
        expandedRecipe={expandedRecipe}
        setExpandedRecipe={setExpandedRecipe}
        onCloseResults={() => { setRecipeData(null); setExpandedRecipe(null); }}
        servingMultiplier={servingMultiplier}
        setServingMultiplier={setServingMultiplier}
        onToggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
        onShareRecipe={shareRecipe}
        onAddToPlanner={(recipe) => { setRecipeToAssign(recipe); setExpandedRecipe(null); setRecipeData(null); setPlannerOpen(true); }}
      />

      {/* Sponsored Section */}
      <SponsoredSection className="z-15" />

      {/* Section 2: Nutrition Goals */}
      <ErrorBoundary>
        <NutritionSection
          nutritionRef={nutritionRef}
          nutritionGoals={nutritionGoals}
          onUpdateGoals={(goals) => { trackEvent(EVENTS.NUTRITION_GOALS_UPDATED, { goals }); setNutritionGoals(goals); }}
        />
      </ErrorBoundary>

      {/* Section 3: Recipe Gallery */}
      <ErrorBoundary>
        <GallerySection
          galleryRef={galleryRef}
          recipes={personalizedRecipes}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          onOpenRecipe={(recipe) => {
            trackEvent(EVENTS.RECIPE_DETAIL_OPEN, { recipeName: recipe.name, tags: recipe.tags });
            setSelectedGalleryRecipe(recipe);
          }}
        />
      </ErrorBoundary>

      {/* Partner Offers */}
      <PartnerOffersSection />

      {/* Section 4: Smart Substitutions */}
      <ErrorBoundary>
        <SmartSwapSection
          substituteRef={substituteRef}
          session={session}
          userProfile={userProfile}
          showToast={showToast}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      </ErrorBoundary>

      {/* Section 5: Meal Planner Preview */}
      <ErrorBoundary>
        <PlannerPreviewSection
          plannerRef={plannerRef}
          plannerMeals={plannerMeals}
          onOpenPlanner={(day) => {
            if (day) setPlannerActiveDay(day);
            setPlannerOpen(true);
          }}
        />
      </ErrorBoundary>

      {/* Planner Full-Screen Overlay (portalled to escape GSAP transforms) */}
      {plannerOpen && createPortal(
        <PlannerOverlay
          plannerMeals={plannerMeals}
          plannerActiveDay={plannerActiveDay}
          setPlannerActiveDay={setPlannerActiveDay}
          recipeToAssign={recipeToAssign}
          setRecipeToAssign={setRecipeToAssign}
          favorites={favorites}
          recentRecipes={recentRecipes}
          nutritionGoals={nutritionGoals}
          onAddRecipeToPlanner={addRecipeToPlanner}
          onRemoveFromPlanner={removeFromPlanner}
          onClearPlannerDay={clearPlannerDay}
          onClearPlannerWeek={clearPlannerWeek}
          onShareMealPlan={shareMealPlan}
          onOpenExportModal={() => { trackEvent(EVENTS.CALENDAR_EXPORTED); setExportModalOpen(true); }}
          onClose={() => { setPlannerOpen(false); setRecipeToAssign(null); }}
        />,
        document.body
      )}

      {/* Export Calendar Modal (portalled to escape GSAP transforms) */}
      {exportModalOpen && createPortal(
        <ExportCalendarModal
          plannerMeals={plannerMeals}
          onClose={() => setExportModalOpen(false)}
        />,
        document.body
      )}

      {/* Favorites Overlay (portalled to escape GSAP transforms) */}
      {favoritesOpen && createPortal(
        <FavoritesOverlay
          favorites={favorites}
          onRemoveFavorite={removeFavorite}
          onAddToPlanner={(recipe) => { setRecipeToAssign(recipe); setFavoritesOpen(false); setPlannerOpen(true); }}
          onClose={() => setFavoritesOpen(false)}
        />,
        document.body
      )}

      {/* Recipe Detail Overlay (portalled to escape GSAP transforms) */}
      {selectedGalleryRecipe && createPortal(
        <RecipeDetailOverlay
          recipe={selectedGalleryRecipe}
          isFavorite={isFavorite(selectedGalleryRecipe.name)}
          onToggleFavorite={toggleFavorite}
          onAddToPlanner={(recipe) => {
            setRecipeToAssign(recipe);
            setSelectedGalleryRecipe(null);
            setPlannerOpen(true);
          }}
          onShareRecipe={shareRecipe}
          onClose={() => setSelectedGalleryRecipe(null)}
        />,
        document.body
      )}

      {/* Section 6: Community Favorites */}
      <ErrorBoundary>
        <CommunitySection communityRef={communityRef} />
      </ErrorBoundary>

      {/* Recommended Essentials */}
      <SponsoredSection title="Sponsored &middot; Recommended Kitchen Essentials" className="bg-warm-gray z-[65]" />

      {/* Section 7: CTA + Footer */}

      <CtaSection
        ctaRef={ctaRef}
        onStartCooking={() => {
          setMode('recipe');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Nutrition Goals Modal (portalled to escape GSAP transforms) */}
      {goalsSettingsOpen && createPortal(
        <NutritionGoalsModal
          nutritionGoals={nutritionGoals}
          onUpdateGoals={(goals) => { trackEvent(EVENTS.NUTRITION_GOALS_UPDATED, { goals }); setNutritionGoals(goals); }}
          onClose={() => setGoalsSettingsOpen(false)}
          showToast={showToast}
        />,
        document.body
      )}

      {/* Shopping List Overlay (portalled to escape GSAP transforms) */}
      {shoppingListOpen && createPortal(
        <ShoppingListOverlay
          shoppingList={shoppingList}
          onToggleItem={toggleShoppingItem}
          onGenerateFromPlan={generateShoppingList}
          onClearPurchased={clearPurchasedItems}
          onClearAll={clearShoppingList}
          onOpenPlanner={() => { setShoppingListOpen(false); setPlannerOpen(true); }}
          onClose={() => setShoppingListOpen(false)}
        />,
        document.body
      )}

      {/* Auth Modal (portalled to escape GSAP transforms) */}
      {authModalOpen && createPortal(
        <AuthModal
          onClose={() => { setAuthModalOpen(false); }}
          showToast={showToast}
        />,
        document.body
      )}

      {/* Toast Notifications */}
      <ToastNotifications
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />

      {/* Privacy-friendly analytics (loads only when VITE_UMAMI_WEBSITE_ID is set) */}
      <Analytics />
    </div>
  );
}

export default App;
