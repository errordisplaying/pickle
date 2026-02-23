import type { AnalyticsEvent } from '@/types';
import { STORAGE_KEYS } from '@/constants';

// ── Event Name Constants ─────────────────────────────────────────

export const EVENTS = {
  // Search & Discovery
  RECIPE_SEARCH: 'recipe_search',
  RECIPE_VIEW: 'recipe_view',
  RECIPE_DETAIL_OPEN: 'recipe_detail_open',

  // Engagement
  RECIPE_FAVORITED: 'recipe_favorited',
  RECIPE_UNFAVORITED: 'recipe_unfavorited',
  RECIPE_SHARED: 'recipe_shared',

  // Planning
  RECIPE_ADDED_TO_PLANNER: 'recipe_added_to_planner',
  RECIPE_REMOVED_FROM_PLANNER: 'recipe_removed_from_planner',
  PLANNER_DAY_CLEARED: 'planner_day_cleared',
  PLANNER_WEEK_CLEARED: 'planner_week_cleared',
  MEAL_PLAN_SHARED: 'meal_plan_shared',
  CALENDAR_EXPORTED: 'calendar_exported',

  // Shopping
  SHOPPING_LIST_GENERATED: 'shopping_list_generated',
  SHOPPING_ITEM_CHECKED: 'shopping_item_checked',

  // Preferences
  DIETARY_FILTER_TOGGLED: 'dietary_filter_toggled',
  NUTRITION_GOALS_UPDATED: 'nutrition_goals_updated',
  SERVING_SIZE_CHANGED: 'serving_size_changed',

  // Specialist Consultations
  SPECIALIST_VIEWED: 'specialist_viewed',
  SPECIALIST_BOOK_CLICKED: 'specialist_book_clicked',

  // Auth
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Smart Swap
  SWAP_SEARCH: 'swap_search',
  SWAP_SUGGESTION_SUBMITTED: 'swap_suggestion_submitted',
} as const;

// ── Session Management ───────────────────────────────────────────

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  lastActivity: number;
}

const generateSessionId = (): string =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getOrCreateSession = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS_SESSION);
    if (stored) {
      const session: SessionData = JSON.parse(stored);
      if (Date.now() - session.lastActivity < SESSION_TIMEOUT) {
        // Refresh activity timestamp
        session.lastActivity = Date.now();
        localStorage.setItem(STORAGE_KEYS.ANALYTICS_SESSION, JSON.stringify(session));
        return session.id;
      }
    }
  } catch { /* ignore parse errors */ }

  // Create new session
  const session: SessionData = { id: generateSessionId(), lastActivity: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS_SESSION, JSON.stringify(session));
  } catch { /* ignore storage errors */ }
  return session.id;
};

// ── Event Queue & Batching ───────────────────────────────────────

let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | undefined;

const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 50;

/**
 * Track an analytics event. Non-blocking, never throws.
 */
export const trackEvent = (
  event: string,
  properties: Record<string, any> = {}
): void => {
  try {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      sessionId: getOrCreateSession(),
      userId: currentUserId,
    };

    eventQueue.push(analyticsEvent);

    // Auto-flush if queue is getting large
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      flushEvents();
    }
  } catch {
    // Analytics should never break the app
  }
};

/**
 * Set the current authenticated user ID for event attribution.
 */
export const setAnalyticsUserId = (userId: string | undefined): void => {
  currentUserId = userId;
};

/**
 * Flush all queued events to the backend.
 */
export const flushEvents = async (): Promise<void> => {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
    });

    if (!response.ok) {
      // Put events back in queue for retry
      eventQueue = [...eventsToSend, ...eventQueue];
    }
  } catch {
    // Network error — put events back for retry
    eventQueue = [...eventsToSend, ...eventQueue];
    // Cap queue size to prevent memory issues
    if (eventQueue.length > MAX_QUEUE_SIZE * 3) {
      eventQueue = eventQueue.slice(-MAX_QUEUE_SIZE);
    }
  }
};

/**
 * Initialize analytics: starts flush timer and registers beforeunload.
 */
export const initAnalytics = (): (() => void) => {
  // Periodic flush
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);

  // Flush on page unload using sendBeacon for reliability
  const handleUnload = () => {
    if (eventQueue.length > 0) {
      const payload = JSON.stringify({ events: eventQueue });
      navigator.sendBeacon('/api/analytics/events', new Blob([payload], { type: 'application/json' }));
      eventQueue = [];
    }
  };

  window.addEventListener('beforeunload', handleUnload);

  // Return cleanup function
  return () => {
    if (flushTimer) clearInterval(flushTimer);
    window.removeEventListener('beforeunload', handleUnload);
    flushEvents(); // Final flush
  };
};
