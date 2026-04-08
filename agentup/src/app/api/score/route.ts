import { openai, MODEL } from '@/lib/ai/openai';
import { getScoringPrompt, SCORING_PROMPT_VERSION } from '@/lib/ai/prompts';
import type { ScoreResult, ConversationMessage, Difficulty } from '@/types';

const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const MAX_CONVERSATION_LENGTH = 20;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario, difficulty, conversation } = body as {
      scenario: string;
      difficulty: Difficulty;
      conversation: ConversationMessage[];
    };

    // Input validation
    if (!scenario || typeof scenario !== 'string' || scenario.length > 5000) {
      return Response.json({ error: 'Invalid scenario' }, { status: 400 });
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return Response.json({ error: 'Invalid difficulty' }, { status: 400 });
    }
    if (!Array.isArray(conversation) || conversation.length === 0) {
      return Response.json(
        { error: 'conversation must be a non-empty array' },
        { status: 400 }
      );
    }
    if (conversation.length > MAX_CONVERSATION_LENGTH) {
      return Response.json(
        { error: `Too many messages (max ${MAX_CONVERSATION_LENGTH})` },
        { status: 400 }
      );
    }

    // Validate conversation entries
    for (const msg of conversation) {
      if (!msg.role || !['agent', 'customer'].includes(msg.role)) {
        return Response.json({ error: 'Invalid message role' }, { status: 400 });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return Response.json(
          { error: 'Invalid message content' },
          { status: 400 }
        );
      }
    }

    const prompt = getScoringPrompt(scenario, difficulty, conversation);

    let response;
    try {
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a call centre quality assurance evaluator. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500,
      });
    } catch (error) {
      console.warn(`[Score API] Primary model (${MODEL}) failed, hot-swapping to gpt-4o-mini:`, error);
      // Hot-swap failover to gpt-4o-mini
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a call centre quality assurance evaluator. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500,
      });
    }

    const content = response.choices[0]?.message?.content || '{}';

    let score: ScoreResult;
    try {
      score = JSON.parse(content);
    } catch {
      return Response.json(
        { error: 'Failed to parse scoring response' },
        { status: 500 }
      );
    }

    // Validate score structure — check that required fields exist
    if (
      score.empathy?.score === undefined ||
      score.accuracy?.score === undefined ||
      score.resolution?.score === undefined ||
      score.professionalism?.score === undefined
    ) {
      return Response.json(
        { error: 'Invalid scoring response structure' },
        { status: 500 }
      );
    }

    // Clamp individual scores to 0-25 range — Defensive coercion included
    score.empathy.score = Math.max(0, Math.min(25, Math.round(Number(score.empathy.score) || 0)));
    score.accuracy.score = Math.max(0, Math.min(25, Math.round(Number(score.accuracy.score) || 0)));
    score.resolution.score = Math.max(0, Math.min(25, Math.round(Number(score.resolution.score) || 0)));
    score.professionalism.score = Math.max(0, Math.min(25, Math.round(Number(score.professionalism.score) || 0)));

    // Ensure totalScore matches sum
    score.totalScore =
      score.empathy.score +
      score.accuracy.score +
      score.resolution.score +
      score.professionalism.score;

    // Ensure string fields have defaults
    score.strength = score.strength || '';
    score.improvement = score.improvement || '';
    score.tip = score.tip || '';

    // Attach prompt version for reproducibility
    (score as ScoreResult & { promptVersion?: string }).promptVersion = SCORING_PROMPT_VERSION;

    return Response.json(score);
  } catch (error) {
    console.error('[Score API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
