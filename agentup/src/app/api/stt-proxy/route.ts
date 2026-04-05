// Server-side Deepgram STT Proxy
// Client sends audio chunks via POST, server forwards to Deepgram via WebSocket
// Returns transcripts via SSE stream
//
// Architecture:
//   Browser (mic audio) → POST /api/stt-proxy → Deepgram WebSocket → SSE transcripts back
//
// Why proxy instead of client-direct:
// 1. API key NEVER leaves the server — not even temporary keys
// 2. Server can log/replay audio for debugging
// 3. Server can inject audio preprocessing
// 4. Single point of control for reconnection, rate limiting, abuse prevention
//
// Note: For production scale, replace with a dedicated WebSocket server (e.g., via custom Next.js server
// or a separate Node process). The SSE approach works for single-user MVP.

import { WebSocket } from 'ws';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Store active Deepgram connections by session ID
const activeSessions = new Map<string, {
  ws: WebSocket;
  controller: ReadableStreamDefaultController | null;
  lastActivity: number;
}>();

// Clean up stale sessions every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions) {
      if (now - session.lastActivity > 60000) { // 60s idle timeout
        session.ws.close();
        activeSessions.delete(id);
      }
    }
  }, 30000);
}

// POST: Initialize a new STT session, return SSE stream of transcripts
export async function POST(request: Request) {
  if (!DEEPGRAM_API_KEY) {
    return Response.json({ error: 'Deepgram not configured' }, { status: 500 });
  }

  const contentType = request.headers.get('content-type') || '';

  // If content-type is JSON, this is a session control message
  if (contentType.includes('application/json')) {
    const body = await request.json();

    if (body.action === 'start') {
      return startSession(body.sessionId);
    }

    if (body.action === 'audio' && body.sessionId) {
      return handleAudioChunk(body.sessionId, body.audio);
    }

    if (body.action === 'stop' && body.sessionId) {
      return stopSession(body.sessionId);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  return Response.json({ error: 'Invalid content type' }, { status: 400 });
}

function startSession(sessionId: string): Response {
  // Clean up existing session if any
  const existing = activeSessions.get(sessionId);
  if (existing) {
    existing.ws.close();
    activeSessions.delete(sessionId);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Connect to Deepgram
      const dgUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=300&vad_events=true&utterance_end_ms=1000&encoding=linear16&sample_rate=16000&channels=1`;

      const ws = new WebSocket(dgUrl, {
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
      });

      const session = {
        ws,
        controller,
        lastActivity: Date.now(),
      };

      ws.on('open', () => {
        activeSessions.set(sessionId, session);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );

        // Keepalive
        const keepAlive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'KeepAlive' }));
          } else {
            clearInterval(keepAlive);
          }
        }, 8000);
      });

      ws.on('message', (data: Buffer) => {
        session.lastActivity = Date.now();
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'UtteranceEnd') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'utterance_end' })}\n\n`)
            );
            return;
          }

          if (msg.type === 'Results' && msg.channel?.alternatives?.[0]) {
            const transcript = msg.channel.alternatives[0].transcript;
            if (!transcript) return;

            // Extract word-level timing and confidence for prosodic analysis
            const words = msg.channel.alternatives[0].words || [];
            const confidence = msg.channel.alternatives[0].confidence || 0;

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'transcript',
                transcript,
                is_final: msg.is_final,
                speech_final: msg.speech_final || false,
                confidence,
                words: words.map((w: { word: string; start: number; end: number; confidence: number }) => ({
                  word: w.word,
                  start: w.start,
                  end: w.end,
                  confidence: w.confidence,
                })),
              })}\n\n`)
            );
          }
        } catch {
          // Ignore parse errors
        }
      });

      ws.on('error', () => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Deepgram connection error' })}\n\n`)
        );
      });

      ws.on('close', () => {
        activeSessions.delete(sessionId);
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'closed' })}\n\n`)
          );
          controller.close();
        } catch {
          // Controller already closed
        }
      });
    },
    cancel() {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.ws.close();
        activeSessions.delete(sessionId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function handleAudioChunk(sessionId: string, audioBase64: string): Response {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.ws.readyState !== WebSocket.OPEN) {
    return Response.json({ error: 'Deepgram not connected' }, { status: 503 });
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    session.ws.send(audioBuffer);
    session.lastActivity = Date.now();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to send audio' }, { status: 500 });
  }
}

function stopSession(sessionId: string): Response {
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      session.ws.send(JSON.stringify({ type: 'CloseStream' }));
    } catch {
      // Ignore
    }
    session.ws.close();
    activeSessions.delete(sessionId);
  }
  return Response.json({ ok: true });
}
