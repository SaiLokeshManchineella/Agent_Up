import { openai, MODEL } from '@/lib/ai/openai';
import { getCustomerSystemPrompt } from '@/lib/ai/prompts';
import type { Difficulty } from '@/types';

const VALID_CHANNELS = new Set(['chat', 'call']);
const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, scenario, difficulty, channel } = body;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages must be a non-empty array' }, { status: 400 });
    }
    if (messages.length > MAX_MESSAGES) {
      return Response.json({ error: `Too many messages (max ${MAX_MESSAGES})` }, { status: 400 });
    }
    if (!scenario || typeof scenario !== 'string' || scenario.length > 5000) {
      return Response.json({ error: 'Invalid scenario' }, { status: 400 });
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return Response.json({ error: 'Invalid difficulty' }, { status: 400 });
    }
    if (!VALID_CHANNELS.has(channel)) {
      return Response.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // Sanitize messages
    const sanitizedMessages = messages.slice(-MAX_MESSAGES).map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: typeof m.content === 'string'
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : '',
      })
    );

    const systemPrompt = getCustomerSystemPrompt(
      scenario,
      difficulty as Difficulty,
      channel as 'chat' | 'call'
    );

    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedMessages,
      ],
      stream: true,
      max_tokens: 300,
      temperature: 0.8,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          console.error('Chat stream error:', streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
