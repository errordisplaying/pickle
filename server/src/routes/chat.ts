import { Router } from 'express';
import type { Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// ── OpenAI Client ───────────────────────────────────────────────

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// ── Rate Limiter (per-IP, sliding window) ───────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20;           // max messages per window

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    bucket.timestamps = bucket.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (bucket.timestamps.length === 0) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);

  if (!bucket) {
    bucket = { timestamps: [] };
    rateBuckets.set(ip, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  bucket.timestamps.push(now);
  return false;
}

// ── Input Sanitization ──────────────────────────────────────────

function sanitize(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// ── System Prompt Builder ───────────────────────────────────────

function buildSystemPrompt(context: {
  dishName: string;
  ingredients: string[];
  steps?: string[];
}): string {
  let prompt = `You are Chickpea, a friendly and knowledgeable cooking companion. You're helping someone cook in real time.

The user is currently cooking: ${context.dishName}
Their available ingredients: ${context.ingredients.join(', ')}`;

  if (context.steps && context.steps.length > 0) {
    prompt += `\n\nRecipe steps:\n${context.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  prompt += `\n\nGuidelines:
- Be concise (2-3 sentences max unless they ask for more detail)
- Give practical, actionable cooking advice
- If they ask about substitutions, flavor adjustments, or technique, answer specifically for their dish
- Use a warm, encouraging tone
- If they describe a problem (burning, too salty, etc.), give an immediate fix
- You can suggest adding or removing ingredients from their list
- Never recommend unsafe food practices`;

  return prompt;
}

// ── POST /api/chat ──────────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
      return;
    }

    // Check OpenAI availability
    const client = getOpenAI();
    if (!client) {
      res.status(503).json({ error: 'Chat service is not configured.' });
      return;
    }

    // Validate request body
    const { messages, context } = req.body;

    if (!context?.dishName || !Array.isArray(context?.ingredients) || context.ingredients.length === 0) {
      res.status(400).json({ error: 'Missing dish name or ingredients.' });
      return;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    // Sanitize context
    const sanitizedContext = {
      dishName: sanitize(context.dishName, 200),
      ingredients: context.ingredients.slice(0, 30).map((i: string) => sanitize(String(i), 100)),
      steps: context.steps?.slice(0, 30).map((s: string) => sanitize(String(s), 500)),
    };

    // Build messages for OpenAI (limit to last 20 user/assistant messages)
    const systemMessage = {
      role: 'system' as const,
      content: buildSystemPrompt(sanitizedContext),
    };

    const conversationMessages = messages
      .slice(-20)
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: sanitize(String(m.content), 1000),
      }));

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...conversationMessages],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      res.status(500).json({ error: 'No response from AI.' });
      return;
    }

    res.json({ message: reply });
  } catch (err: any) {
    console.error('[Chat] Error:', err?.message || err);

    // Forward OpenAI rate limit
    if (err?.status === 429) {
      res.status(429).json({ error: 'AI service is busy. Try again in a moment.' });
      return;
    }

    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

export default router;
