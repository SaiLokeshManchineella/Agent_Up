import { openai, MODEL } from '@/lib/ai/openai';
import { getCustomerSystemPrompt } from '@/lib/ai/prompts';

const MAX_TRANSCRIPT_LENGTH = 2000;
const MAX_MESSAGES = 20;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, messages, scenario, difficulty } = body;

    // Input validation
    if (!transcript || typeof transcript !== 'string') {
      return Response.json({ error: 'Missing transcript' }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return Response.json({ error: 'Transcript too long' }, { status: 400 });
    }
    if (!scenario || typeof scenario !== 'string' || scenario.length > 5000) {
      return Response.json({ error: 'Invalid scenario' }, { status: 400 });
    }
    if (
      !difficulty ||
      !['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)
    ) {
      return Response.json({ error: 'Invalid difficulty' }, { status: 400 });
    }
    if (!Array.isArray(messages)) {
      return Response.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    const systemPrompt = getCustomerSystemPrompt(scenario, difficulty, 'call');

    // Build conversation history — sanitize and limit
    const chatMessages = messages
      .slice(-MAX_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'agent' ? ('user' as const) : ('assistant' as const),
        content:
          typeof m.content === 'string'
            ? m.content.slice(0, MAX_TRANSCRIPT_LENGTH)
            : '',
      }));

    chatMessages.push({
      role: 'user' as const,
      content: transcript.slice(0, MAX_TRANSCRIPT_LENGTH),
    });

    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
      stream: true,
      max_tokens: 200,
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
          console.error('Voice stream error:', streamError);
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
    console.error('Voice API error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
