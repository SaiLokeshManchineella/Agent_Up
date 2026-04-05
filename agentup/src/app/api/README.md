# API Routes Reference

All routes include: input validation, try/catch error handling, and meaningful error responses.

## Routes

### `GET /api/cases`
Returns all training cases (default + custom). Seeds default cases on first access.

**Response**: `Case[]`

### `POST /api/cases`
Create a new training case. Validates all fields, checks for duplicates (title + topic + difficulty).

**Body**: `{ title, scenario, openingMessage, channel, topic, difficulty }`
**Response**: `Case` (201) | `{ error }` (400/409)

### `POST /api/chat`
AI customer response for chat simulation. Streams response via SSE.

**Body**: `{ messages, scenario, difficulty, channel }`
**Response**: SSE stream (`data: {"text": "..."}\n\n` ... `data: [DONE]\n\n`)

### `POST /api/voice`
AI customer response for voice simulation. Same as chat but with `channel: 'call'` and shorter `max_tokens`.

**Body**: `{ transcript, messages, scenario, difficulty }`
**Response**: SSE stream

### `POST /api/score`
Score a completed conversation. Returns 4-dimension breakdown with specific feedback.

**Body**: `{ scenario, difficulty, conversation }`
**Response**: `ScoreResult` with `promptVersion` attached

### `GET /api/sessions?type=<type>`
Dashboard data. Supported types:
- `daily-scores` — last 30 days average scores
- `topic-scores` — average score by topic
- `channel-scores` — average score by channel (chat vs call)
- `stats` — current streak, sessions this week, top skill, skill to improve
- `history` — last 10 session cases with details
- *(no type)* — all sessions

### `POST /api/sessions`
Save a completed training session. Uses a transaction — all data saved atomically.
Returns the updated streak count so the client doesn't need a separate fetch.

**Body**: `{ totalScore, casesCompleted, sessionCases[] }`
**Response**: `{ id, currentStreak }` (201)

### `POST /api/tts`
Convert text to speech audio. Tries Cartesia Sonic first, falls back to OpenAI TTS.

**Body**: `{ text }`
**Response**: `audio/mpeg` binary

### `GET /api/deepgram`
Get a Deepgram API key for client-side STT. Tries to generate a temporary scoped key (30s TTL). Falls back to the main key if temp key creation fails (e.g., free plan without keys:write scope).

**Response**: `{ apiKey, temporary }`

### `POST /api/stt-proxy`
Server-side Deepgram WebSocket proxy. The API key never leaves the server.

**Actions**:
- `{ action: 'start', sessionId }` — Start SSE stream of transcripts
- `{ action: 'audio', sessionId, audio }` — Send base64 audio chunk
- `{ action: 'stop', sessionId }` — Close session

## Error Handling Pattern

All routes follow this pattern:

```typescript
export async function POST(request: Request) {
  try {
    // Validate inputs
    if (!body.field) return Response.json({ error: '...' }, { status: 400 });
    
    // Business logic
    // ...
    
    return Response.json(result);
  } catch (error) {
    console.error('[RouteLabel] Error:', error);
    return Response.json({ error: 'message' }, { status: 500 });
  }
}
```
