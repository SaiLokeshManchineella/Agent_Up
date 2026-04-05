// TTS endpoint — Cartesia Sonic (primary) → OpenAI TTS (fallback)
// Cartesia: ~130ms latency, byte-level streaming, production voice AI standard

import { openai } from '@/lib/ai/openai';

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
// Cartesia voice IDs — natural, expressive voices
const CARTESIA_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091'; // "Barbershop Man" - warm male voice
const CARTESIA_MODEL = 'sonic-2';
const MAX_TEXT_LENGTH = 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response('Missing or empty text', { status: 400 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        `Text too long (max ${MAX_TEXT_LENGTH} chars)`,
        { status: 400 }
      );
    }

    // Try Cartesia first (lowest latency, best for real-time voice AI)
    if (CARTESIA_API_KEY) {
      try {
        const response = await fetch('https://api.cartesia.ai/tts/bytes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CARTESIA_API_KEY,
            'Cartesia-Version': '2024-06-10',
          },
          body: JSON.stringify({
            model_id: CARTESIA_MODEL,
            transcript: text,
            voice: {
              mode: 'id',
              id: CARTESIA_VOICE_ID,
            },
            output_format: {
              container: 'mp3',
              bit_rate: 128000,
              sample_rate: 44100,
            },
          }),
        });

        if (response.ok) {
          return new Response(response.body, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache',
            },
          });
        }

        const errorText = await response.text();
        console.error('Cartesia error:', response.status, errorText);
      } catch (cartesiaError) {
        console.error('Cartesia TTS failed:', cartesiaError);
      }
    }

    // Fallback to OpenAI TTS
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      return new Response(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (openaiError) {
      console.error('OpenAI TTS also failed:', openaiError);
    }

    return new Response('All TTS providers failed', { status: 500 });
  } catch (error) {
    console.error('TTS API error:', error);
    return new Response('TTS request failed', { status: 500 });
  }
}
