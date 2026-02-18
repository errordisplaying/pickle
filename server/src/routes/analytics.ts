import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import type { AnalyticsEventPayload } from '../types/recipe.js';

const router = Router();

// Known event names for validation
const VALID_EVENTS = new Set([
  'recipe_search', 'recipe_view', 'recipe_detail_open',
  'recipe_favorited', 'recipe_unfavorited', 'recipe_shared',
  'recipe_added_to_planner', 'recipe_removed_from_planner',
  'planner_day_cleared', 'planner_week_cleared',
  'meal_plan_shared', 'calendar_exported',
  'shopping_list_generated', 'shopping_item_checked',
  'dietary_filter_toggled', 'nutrition_goals_updated', 'serving_size_changed',
  'user_signed_in', 'user_signed_out',
]);

// Events that carry ingredient data for the ingredient_stats table
const INGREDIENT_EVENTS = new Set([
  'recipe_search',
  'recipe_favorited',
  'recipe_added_to_planner',
]);

/**
 * Extract individual ingredients from a search query string.
 * "chicken, rice, garlic" → ["chicken", "rice", "garlic"]
 */
const parseIngredientList = (raw: string): string[] => {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[,\n]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 1 && s.length < 50);
};

/**
 * Update ingredient_stats counters for business intelligence.
 */
const updateIngredientStats = async (
  ingredients: string[],
  column: 'search_count' | 'favorite_count' | 'planner_count'
): Promise<void> => {
  if (!supabase || ingredients.length === 0) return;

  for (const ingredient of ingredients) {
    // Upsert: increment the count if row exists, create if not
    const { data: existing } = await supabase
      .from('ingredient_stats')
      .select('ingredient, search_count, favorite_count, planner_count')
      .eq('ingredient', ingredient)
      .single();

    if (existing) {
      await supabase
        .from('ingredient_stats')
        .update({
          [column]: (existing[column] || 0) + 1,
          last_seen: new Date().toISOString(),
        })
        .eq('ingredient', ingredient);
    } else {
      await supabase
        .from('ingredient_stats')
        .insert({
          ingredient,
          [column]: 1,
          last_seen: new Date().toISOString(),
        });
    }
  }
};

// ── POST /api/analytics/events — Receive batched events ──────────

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { events } = req.body as AnalyticsEventPayload;

    if (!events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'No events provided' });
      return;
    }

    // Validate and filter events
    const validEvents = events.filter(e =>
      e.event && VALID_EVENTS.has(e.event) &&
      e.sessionId && typeof e.sessionId === 'string' &&
      e.timestamp && typeof e.timestamp === 'number'
    );

    console.log(`[Analytics] Received ${events.length} events (${validEvents.length} valid)`);

    // Log to console (always works, even without Supabase)
    validEvents.forEach(e => {
      const props = Object.keys(e.properties || {}).join(', ');
      console.log(`  → ${e.event}${props ? ` (${props})` : ''}`);
    });

    // Store in Supabase if configured
    if (supabase && validEvents.length > 0) {
      const rows = validEvents.map(e => ({
        session_id: e.sessionId,
        user_id: e.userId || null,
        event: e.event,
        properties: e.properties || {},
        created_at: new Date(e.timestamp).toISOString(),
      }));

      const { error } = await supabase
        .from('analytics_events')
        .insert(rows);

      if (error) {
        console.warn('[Analytics] Supabase insert error:', error.message);
      }

      // Update ingredient stats for relevant events
      for (const event of validEvents) {
        if (!INGREDIENT_EVENTS.has(event.event)) continue;

        if (event.event === 'recipe_search' && event.properties.ingredients) {
          const ingredients = parseIngredientList(event.properties.ingredients);
          await updateIngredientStats(ingredients, 'search_count');
        }

        if (event.event === 'recipe_favorited' && event.properties.tags) {
          // Use recipe tags as a proxy for ingredient categories
          const tags = (event.properties.tags as string[]).map(t => t.toLowerCase());
          await updateIngredientStats(tags, 'favorite_count');
        }

        if (event.event === 'recipe_added_to_planner' && event.properties.tags) {
          const tags = (event.properties.tags as string[]).map(t => t.toLowerCase());
          await updateIngredientStats(tags, 'planner_count');
        }
      }
    }

    res.json({ received: validEvents.length });
  } catch (error: any) {
    console.error('[Analytics] Error:', error.message);
    res.status(500).json({ error: 'Failed to process analytics events' });
  }
});

// ── GET /api/analytics/ingredients — Ingredient frequency data ───

router.get('/ingredients', async (_req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.json({ ingredients: [], message: 'Supabase not configured' });
      return;
    }

    const { data, error } = await supabase
      .from('ingredient_stats')
      .select('*')
      .order('search_count', { ascending: false })
      .limit(100);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ ingredients: data || [] });
  } catch (error: any) {
    console.error('[Analytics] Ingredients endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch ingredient stats' });
  }
});

// ── GET /api/analytics/dashboard — Aggregated stats ──────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    if (!supabase) {
      res.json({ message: 'Supabase not configured', stats: {} });
      return;
    }

    // Total events count
    const { count: totalEvents } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true });

    // Events by type
    const { data: eventCounts } = await supabase
      .from('analytics_events')
      .select('event')
      .order('created_at', { ascending: false })
      .limit(1000);

    const eventBreakdown: Record<string, number> = {};
    (eventCounts || []).forEach((row: any) => {
      eventBreakdown[row.event] = (eventBreakdown[row.event] || 0) + 1;
    });

    // Unique sessions (approximate)
    const { data: sessions } = await supabase
      .from('analytics_events')
      .select('session_id')
      .limit(1000);

    const uniqueSessions = new Set((sessions || []).map((r: any) => r.session_id)).size;

    // Top ingredients
    const { data: topIngredients } = await supabase
      .from('ingredient_stats')
      .select('*')
      .order('search_count', { ascending: false })
      .limit(20);

    res.json({
      stats: {
        totalEvents: totalEvents || 0,
        uniqueSessions,
        eventBreakdown,
        topIngredients: topIngredients || [],
      },
    });
  } catch (error: any) {
    console.error('[Analytics] Dashboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
